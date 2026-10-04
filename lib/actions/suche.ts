"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { isPlatformOperator, type Bereich } from "@/lib/server/current-user-role";
import { oderFilter, suchTokens } from "@/lib/suche/suchbegriff";
import { APP_FUNKTIONEN, filtereFunktionen } from "@/lib/suche/funktionen";

const LIMIT = 8;

export type SucheEinrichtung = { id: string; name: string; ort: string | null; bundeslandCode: string };
export type SucheKind = { id: string; name: string; einrichtungId: string; einrichtungName: string; gruppe: string | null; status: string };
export type SuchePerson = { id: string; name: string; einrichtungId: string; einrichtungName: string; rolle: string | null };
export type SucheFunktion = { label: string; href: string };
export type SucheErgebnis = {
  einrichtungen: SucheEinrichtung[];
  kinder: SucheKind[];
  team: SuchePerson[];
  funktionen: SucheFunktion[];
  aktiveEinrichtungId: string | null;
};

const LEER: SucheErgebnis = { einrichtungen: [], kinder: [], team: [], funktionen: [], aktiveEinrichtungId: null };

type Zugriffskarte = { ansehen: Record<Bereich, Set<string>>; bearbeiten: Record<Bereich, Set<string>>; traegerAdmin: boolean };

/** Welche Einrichtungen darf der Nutzer je Bereich ansehen/bearbeiten? Spiegelt app.current_user_zugriff(): Träger-Admin
 * und Einrichtungsleitung haben für alle Bereiche außer "finanzen" überall "bearbeiten", alle anderen nur, was in
 * einrichtung_berechtigungen steht. Die eigentliche Sicherheitsgrenze bleibt RLS — das hier verhindert nur, dass die
 * Suche Namen aus Bereichen zeigt, für die der Nutzer kein Recht hat (z.B. team_select prüft den Bereich nicht). */
async function ladeZugriffskarte(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Zugriffskarte> {
  const leer = () => ({ belegung: new Set<string>(), personal: new Set<string>(), controlling: new Set<string>(), szenario: new Set<string>(), finanzen: new Set<string>() });
  const karte: Zugriffskarte = { ansehen: leer(), bearbeiten: leer(), traegerAdmin: false };

  const { data: profil } = await supabase.from("user_profiles").select("role, trager_id").eq("id", userId).single();
  if (!profil) return karte;

  if (profil.role === "traeger_admin" || profil.role === "einrichtungsleitung") {
    karte.traegerAdmin = profil.role === "traeger_admin";
    const { data: alle } = await supabase.from("einrichtungen").select("id").eq("trager_id", profil.trager_id).is("archived_at", null);
    for (const e of alle ?? []) {
      for (const bereich of ["belegung", "personal", "controlling", "szenario"] as const) {
        karte.ansehen[bereich].add(e.id);
        karte.bearbeiten[bereich].add(e.id);
      }
      if (profil.role === "traeger_admin") {
        karte.ansehen.finanzen.add(e.id);
        karte.bearbeiten.finanzen.add(e.id);
      }
    }
  }

  const { data: rechte } = await supabase.from("einrichtung_berechtigungen").select("einrichtung_id, bereich, zugriff").eq("user_id", userId);
  for (const r of rechte ?? []) {
    const bereich = r.bereich as Bereich;
    if (!karte.ansehen[bereich]) continue;
    if (r.zugriff === "ansehen" || r.zugriff === "bearbeiten") karte.ansehen[bereich].add(r.einrichtung_id);
    if (r.zugriff === "bearbeiten") karte.bearbeiten[bereich].add(r.einrichtung_id);
  }
  return karte;
}

/** Globale Suche: Einrichtungen, Kinder, Mitarbeitende und App-Funktionen. Läuft ausschließlich mit dem Nutzer-Client
 * (RLS) und zusätzlich mit Bereichsfilter; Eingaben werden zu sicheren Tokens (siehe lib/suche/suchbegriff.ts). */
export async function sucheGlobal(eingabe: string): Promise<SucheErgebnis> {
  const tokens = suchTokens(eingabe);
  if (tokens.length === 0) return LEER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return LEER;

  const [karte, aktiveEinrichtungId, istBetreiber] = await Promise.all([
    ladeZugriffskarte(supabase, user.id),
    getActiveEinrichtungId(),
    isPlatformOperator(),
  ]);

  let einrichtungenQuery = supabase
    .from("einrichtungen")
    .select("id, name, address_city, bundesland_code")
    .is("archived_at", null)
    .order("name")
    .limit(LIMIT);
  for (const filter of oderFilter(tokens, ["name", "address_city"])) einrichtungenQuery = einrichtungenQuery.or(filter);

  const kinderIds = [...karte.ansehen.belegung];
  let kinderQuery = supabase
    .from("kinder")
    .select("id, vorname, nachname, status, einrichtung_id, einrichtungen(name), gruppen(name)")
    .in("einrichtung_id", kinderIds)
    .is("archived_at", null)
    .order("nachname")
    .limit(LIMIT);
  for (const filter of oderFilter(tokens, ["vorname", "nachname"])) kinderQuery = kinderQuery.or(filter);

  const teamIds = [...karte.ansehen.personal];
  let teamQuery = supabase
    .from("team")
    .select("id, vorname, nachname, rolle, einrichtung_id, einrichtungen(name)")
    .in("einrichtung_id", teamIds)
    .is("archived_at", null)
    .order("nachname")
    .limit(LIMIT);
  for (const filter of oderFilter(tokens, ["vorname", "nachname"])) teamQuery = teamQuery.or(filter);

  const [einrichtungenRes, kinderRes, teamRes] = await Promise.all([
    einrichtungenQuery,
    kinderIds.length > 0 ? kinderQuery : Promise.resolve({ data: [] }),
    teamIds.length > 0 ? teamQuery : Promise.resolve({ data: [] }),
  ]);

  const darfFunktion = (bereich: Bereich | undefined, bearbeiten: boolean | undefined) => {
    if (!bereich) return true;
    if (!aktiveEinrichtungId) return false;
    return (bearbeiten ? karte.bearbeiten : karte.ansehen)[bereich].has(aktiveEinrichtungId);
  };
  const funktionen = filtereFunktionen(
    APP_FUNKTIONEN.filter(
      (f) => (!f.nurBetreiber || istBetreiber) && (!f.nurTraegerAdmin || karte.traegerAdmin) && darfFunktion(f.bereich, f.bearbeiten)
    ),
    tokens
  )
    .slice(0, LIMIT)
    .map((f) => ({ label: f.label, href: f.href }));

  return {
    aktiveEinrichtungId,
    funktionen,
    einrichtungen: (einrichtungenRes.data ?? []).map((e) => ({ id: e.id, name: e.name, ort: e.address_city, bundeslandCode: e.bundesland_code })),
    kinder: (kinderRes.data ?? []).map((k) => ({
      id: k.id,
      name: `${k.vorname} ${k.nachname}`,
      einrichtungId: k.einrichtung_id,
      einrichtungName: k.einrichtungen?.name ?? "",
      gruppe: k.gruppen?.name ?? null,
      status: k.status,
    })),
    team: (teamRes.data ?? []).map((p) => ({
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
      einrichtungId: p.einrichtung_id,
      einrichtungName: p.einrichtungen?.name ?? "",
      rolle: p.rolle,
    })),
  };
}
