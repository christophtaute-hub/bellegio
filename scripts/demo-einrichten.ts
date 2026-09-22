/**
 * Richtet den Demo-Zugang ein (oder setzt ihn zurück).
 *
 * - Kopiert die Einrichtungen des Quell-Trägers (Standard: "Villa Kunterbunt") mit Gruppen, Kindern, Personal,
 *   Ausfallzeiten und Monatsstunden in einen eigenen Träger "Bellegio Demo". So kann der Demo-Nutzer alles
 *   ausprobieren (auch Löschen, Import, Nutzer anlegen), ohne die Daten des Betreibers anzufassen.
 * - Legt den Demo-Nutzer an (Träger-Administration seines Demo-Trägers, Flag ist_demo: keine Abrechnung, keine
 *   Passwort-/Zwei-Faktor-Änderung, keine Zustimmungspflicht).
 *
 * Nutzung:
 *   npx tsx --env-file=.env.local scripts/demo-einrichten.ts
 *   npx tsx --env-file=.env.local scripts/demo-einrichten.ts --neues-passwort   (Passwort des Demo-Nutzers neu vergeben)
 *
 * Läuft das Skript erneut, werden die Demo-Einrichtungen gelöscht und frisch aus dem Quell-Träger kopiert
 * (= Zurücksetzen). Das Passwort wird nur beim Anlegen bzw. mit --neues-passwort erzeugt und ausgegeben.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../types/database.types";

const QUELL_TRAEGER = "Villa Kunterbunt";
const DEMO_TRAEGER = "Bellegio Demo";
const DEMO_EMAIL = "demo@bellegio.de";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function passwort(): string {
  const bytes = randomBytes(14);
  const p = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return /[0-9]/.test(p) && /[a-z]/.test(p) && /[A-Z]/.test(p) ? p : passwort();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  const sb = createClient<Database>(url, key);
  const neuesPasswort = process.argv.includes("--neues-passwort");

  const { data: quelle } = await sb.from("trager").select("id").eq("name", QUELL_TRAEGER).single();
  if (!quelle) throw new Error(`Quell-Träger "${QUELL_TRAEGER}" nicht gefunden.`);

  // Demo-Träger
  let { data: demo } = await sb.from("trager").select("id").eq("name", DEMO_TRAEGER).maybeSingle();
  if (!demo) {
    const { data: neu, error } = await sb.from("trager").insert({ name: DEMO_TRAEGER }).select("id").single();
    if (error || !neu) throw new Error(error?.message ?? "Demo-Träger nicht angelegt.");
    demo = neu;
  }

  // Bisherige Demo-Einrichtungen samt Inhalt entfernen (Zurücksetzen)
  const { data: alte } = await sb.from("einrichtungen").select("id").eq("trager_id", demo.id);
  const alteIds = (alte ?? []).map((e) => e.id);
  if (alteIds.length > 0) {
    await sb.from("kinder").delete().in("einrichtung_id", alteIds);
    await sb.from("team").delete().in("einrichtung_id", alteIds);
    await sb.from("gruppen").delete().in("einrichtung_id", alteIds);
    await sb.from("einrichtung_berechtigungen").delete().in("einrichtung_id", alteIds);
    await sb.from("loeschprotokoll").delete().in("einrichtung_id", alteIds);
    await sb.from("einrichtungen").delete().in("id", alteIds);
  }

  // Kopieren
  const { data: quellEinrichtungen } = await sb
    .from("einrichtungen")
    .select("*")
    .eq("trager_id", quelle.id)
    .is("archived_at", null)
    .order("name");
  for (const q of quellEinrichtungen ?? []) {
    const { data: e, error } = await sb
      .from("einrichtungen")
      .insert({
        trager_id: demo.id,
        name: q.name,
        address_street: q.address_street,
        address_zip: q.address_zip,
        address_city: q.address_city,
        kita_year_start_month: q.kita_year_start_month,
        bundesland_code: q.bundesland_code,
        vollzeit_wochenstunden: q.vollzeit_wochenstunden,
        empfohlener_anstellungsschluessel: q.empfohlener_anstellungsschluessel,
        standort_gemeinde: q.standort_gemeinde,
        auswaertigen_quote_prozent: q.auswaertigen_quote_prozent,
      })
      .select("id")
      .single();
    if (error || !e) throw new Error(error?.message ?? "Einrichtung nicht kopiert.");

    // Gruppen
    const { data: gruppen } = await sb.from("gruppen").select("*").eq("einrichtung_id", q.id).is("archived_at", null);
    const gruppeNeu = new Map<string, string>();
    for (const g of gruppen ?? []) {
      const { data: ng, error: ge } = await sb
        .from("gruppen")
        .insert({
          einrichtung_id: e.id,
          name: g.name,
          gruppenart: g.gruppenart,
          sollplatze: g.sollplatze,
          sort_order: g.sort_order,
          bw_betriebsform: g.bw_betriebsform,
          bw_altersmischung: g.bw_altersmischung,
          bw_oeffnungszeit_stunden: g.bw_oeffnungszeit_stunden,
          nrw_gruppenform: g.nrw_gruppenform,
          nrw_buchungszeit_stunden: g.nrw_buchungszeit_stunden,
        })
        .select("id")
        .single();
      if (ge || !ng) throw new Error(ge?.message ?? "Gruppe nicht kopiert.");
      gruppeNeu.set(g.id, ng.id);
    }

    // Kinder samt Gewichtungen
    const { data: kinder } = await sb.from("kinder").select("*").eq("einrichtung_id", q.id).is("archived_at", null);
    const kindNeu = new Map<string, string>();
    for (const k of kinder ?? []) {
      const { data: nk, error: ke } = await sb
        .from("kinder")
        .insert({
          einrichtung_id: e.id,
          gruppe_id: k.gruppe_id ? (gruppeNeu.get(k.gruppe_id) ?? null) : null,
          platznummer: k.platznummer,
          vorname: k.vorname,
          nachname: k.nachname,
          geburtsdatum: k.geburtsdatum,
          eintritt: k.eintritt,
          austritt: k.austritt,
          buchungszeit_band_id: k.buchungszeit_band_id,
          notizen: k.notizen,
          status: k.status,
          geschlecht: k.geschlecht,
          einschulungsstatus: k.einschulungsstatus,
          betriebszugehoerigkeit: k.betriebszugehoerigkeit,
          hat_behinderung: k.hat_behinderung,
          vertrag_gueltig_bis: k.vertrag_gueltig_bis,
          wohnort: k.wohnort,
        })
        .select("id")
        .single();
      if (ke || !nk) throw new Error(ke?.message ?? "Kind nicht kopiert.");
      kindNeu.set(k.id, nk.id);
    }
    const { data: faktoren } = await sb.from("kind_weighting_factors").select("kind_id, weighting_factor_id").in("kind_id", Array.from(kindNeu.keys()));
    const faktorZeilen = (faktoren ?? []).map((f) => ({ kind_id: kindNeu.get(f.kind_id)!, weighting_factor_id: f.weighting_factor_id }));
    if (faktorZeilen.length > 0) {
      const { error: fe } = await sb.from("kind_weighting_factors").insert(faktorZeilen);
      if (fe) throw new Error(fe.message);
    }

    // Personal samt Ausfallzeiten und Monatsstunden
    const { data: team } = await sb.from("team").select("*").eq("einrichtung_id", q.id).is("archived_at", null);
    for (const t of team ?? []) {
      const { data: nt, error: te } = await sb
        .from("team")
        .insert({
          einrichtung_id: e.id,
          gruppe_id: t.gruppe_id ? (gruppeNeu.get(t.gruppe_id) ?? null) : null,
          vorname: t.vorname,
          nachname: t.nachname,
          rolle: t.rolle,
          wochenstunden: t.wochenstunden,
          fachkraft: t.fachkraft,
          status: t.status,
          eintritt: t.eintritt,
          austritt: t.austritt,
          role_category: t.role_category,
        })
        .select("id")
        .single();
      if (te || !nt) throw new Error(te?.message ?? "Person nicht kopiert.");
      const { data: ausfall } = await sb.from("team_ausfallzeiten").select("art, von, bis, notizen").eq("team_id", t.id);
      if ((ausfall ?? []).length > 0) await sb.from("team_ausfallzeiten").insert((ausfall ?? []).map((a) => ({ ...a, team_id: nt.id })));
      const { data: stunden } = await sb.from("team_monthly_hours").select("month, wochenstunden").eq("team_id", t.id);
      if ((stunden ?? []).length > 0) await sb.from("team_monthly_hours").insert((stunden ?? []).map((s) => ({ ...s, team_id: nt.id })));
    }
    console.log(`Kopiert: ${q.name} — ${gruppeNeu.size} Gruppen, ${kindNeu.size} Kinder, ${team?.length ?? 0} Personen`);
  }

  // Demo-Nutzer
  const { data: vorhanden } = await sb.from("user_profiles").select("id").eq("email", DEMO_EMAIL).maybeSingle();
  if (!vorhanden) {
    const pw = passwort();
    const { data: u, error } = await sb.auth.admin.createUser({ email: DEMO_EMAIL, password: pw, email_confirm: true });
    if (error || !u.user) throw new Error(error?.message ?? "Demo-Nutzer nicht angelegt.");
    const { error: pe } = await sb.from("user_profiles").insert({
      id: u.user.id,
      email: DEMO_EMAIL,
      full_name: "Demo",
      role: "traeger_admin",
      trager_id: demo.id,
      kann_rechte_verwalten: true,
      ist_demo: true,
    });
    if (pe) throw new Error(pe.message);
    console.log(`\nDemo-Zugang angelegt: ${DEMO_EMAIL} / ${pw}`);
  } else if (neuesPasswort) {
    const pw = passwort();
    const { error } = await sb.auth.admin.updateUserById(vorhanden.id, { password: pw });
    if (error) throw new Error(error.message);
    console.log(`\nNeues Passwort für ${DEMO_EMAIL}: ${pw}`);
  } else {
    console.log(`\nDemo-Zugang ${DEMO_EMAIL} besteht bereits (Passwort unverändert).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
