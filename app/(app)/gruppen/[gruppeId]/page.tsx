import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { buttonVariants } from "@/components/ui/button";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { NachfolgerZuordnen, type NachrueckerOption } from "@/components/gruppen/nachfolger-zuordnen";
import { GruppePersonalKarte } from "@/components/gruppen/gruppe-personal-karte";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { ersterKritischerMonat } from "@/lib/steuerung/gruppen-status";
import {
  KinderTable,
  type GruppenSortSpalte,
  type KindZeile,
  type KinderTableRow,
} from "@/components/gruppen/kinder-table";
import { HinweiseBox, type HinweisEintrag } from "@/components/gruppen/hinweise-box";
import {
  austrittWarnung,
  verlaengerungWarnung,
  krippenUebergangWarnung,
  formatDate,
  toIsoDateString,
  parseIsoDate,
} from "@/lib/kita-datum";
import { berechneSitzplaetze, findePlatzVonKindId, bestimmeBelegungsStatus } from "@/lib/gruppen/sitzplaetze";
import { berechneBelegungsVorschau } from "@/lib/belegung/vorschau";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { PassungsEinschaetzung } from "@/lib/kinder/gruppen-passung";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

// Horizont für die Handlungsbedarf-Vorschau auf dieser Seite — bewusst kürzer als die volle
// 18-Monats-Tabelle unter /gruppen/vorschau, da hier nur die nächsten anstehenden Plätze zählen.
const HANDLUNGSBEDARF_MONATE = 15;
const HANDLUNGSBEDARF_MAX_EINTRAEGE = 2;
// Bei Massenaustritten (z. B. Schuleintritt im September) nur die ersten Kinder mit eigenem Auswahlfeld zeigen.
const NACHFOLGE_SICHTBAR = 3;

const PASSUNG_AMPEL: Record<PassungsEinschaetzung, Ampel> = { gut: "gruen", bedingt: "gelb", schlecht: "rot" };
const PASSUNG_LABEL: Record<PassungsEinschaetzung, string> = {
  gut: "Gut passend",
  bedingt: "Bedingt passend",
  schlecht: "Schlecht passend",
};

function monatLang(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

const KIND_SELECT =
  "id, vorname, nachname, geburtsdatum, geschlecht, eintritt, austritt, vertrag_gueltig_bis, status, ersetzt_kind_id, booking_time_bands(label)";

const SORT_SPALTEN: GruppenSortSpalte[] = ["name", "buchungszeit", "eintritt", "austritt", "status"];
function istSortSpalte(value: string | undefined): value is GruppenSortSpalte {
  return SORT_SPALTEN.includes(value as GruppenSortSpalte);
}

type RohKind = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  status: string;
  ersetzt_kind_id: string | null;
  booking_time_bands: { label: string } | null;
};

function vergleicheNullableDatum(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function sortiereFuerAnzeige(zeilen: KindZeile[], spalte: GruppenSortSpalte, richtung: "asc" | "desc"): KindZeile[] {
  const vorzeichen = richtung === "desc" ? -1 : 1;
  return [...zeilen].sort((a, b) => {
    switch (spalte) {
      case "name":
        return vorzeichen * `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, "de");
      case "buchungszeit":
        return vorzeichen * (a.booking_time_bands?.label ?? "").localeCompare(b.booking_time_bands?.label ?? "", "de");
      case "eintritt":
        return vorzeichen * vergleicheNullableDatum(a.eintritt, b.eintritt);
      case "austritt":
        return vorzeichen * vergleicheNullableDatum(a.austritt, b.austritt);
      case "status":
        return vorzeichen * a.status.localeCompare(b.status, "de");
      default:
        return 0;
    }
  });
}

async function resolveWeightingFactors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kindIds: string[]
): Promise<Map<string, { label: string; code: string }>> {
  if (kindIds.length === 0) return new Map();
  const { data } = await supabase
    .from("kind_weighting_factors")
    .select("kind_id, weighting_factors(label, factor, code)")
    .in("kind_id", kindIds);

  const byKind = new Map<string, { label: string; code: string }>();
  const maxFactor = new Map<string, number>();
  for (const row of data ?? []) {
    const factor = row.weighting_factors?.factor ?? 0;
    const current = maxFactor.get(row.kind_id) ?? -1;
    if (factor > current && row.weighting_factors) {
      maxFactor.set(row.kind_id, factor);
      byKind.set(row.kind_id, { label: row.weighting_factors.label, code: row.weighting_factors.code });
    }
  }
  return byKind;
}

async function resolveAktuelleNotizen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kindIds: string[]
): Promise<Map<string, string>> {
  if (kindIds.length === 0) return new Map();
  const { data } = await supabase
    .from("kind_notizen_verlauf")
    .select("kind_id, text, erstellt_am")
    .in("kind_id", kindIds)
    .order("erstellt_am", { ascending: false });
  const byKind = new Map<string, string>();
  for (const row of data ?? []) {
    if (!byKind.has(row.kind_id)) byKind.set(row.kind_id, row.text);
  }
  return byKind;
}

function zuKindZeile(
  kind: RohKind,
  platz: number | null,
  weightingLabels: Map<string, { label: string; code: string }>,
  notizen: Map<string, string>
): KindZeile {
  const gewichtung = weightingLabels.get(kind.id);
  return {
    frei: false,
    id: kind.id,
    platz,
    vorname: kind.vorname,
    nachname: kind.nachname,
    geburtsdatum: kind.geburtsdatum,
    geschlecht: kind.geschlecht,
    eintritt: kind.eintritt,
    austritt: kind.austritt,
    vertrag_gueltig_bis: kind.vertrag_gueltig_bis,
    notizAktuell: notizen.get(kind.id) ?? null,
    status: kind.status,
    booking_time_bands: kind.booking_time_bands,
    weighting_factor_label: gewichtung?.label ?? null,
    weighting_factor_code: gewichtung?.code ?? null,
  };
}

export default async function GruppeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ gruppeId: string }>;
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const { gruppeId } = await params;
  const { q = "", sort: sortParam, dir: dirParam } = await searchParams;
  const sort: GruppenSortSpalte | null = istSortSpalte(sortParam) ? sortParam : null;
  const dir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: gruppe } = await supabase
    .from("gruppen")
    .select(
      "id, name, gruppenart, sollplatze, sort_order, einrichtung_id, einrichtungen(kita_year_start_month, bundesland_code, standort_gemeinde, auswaertigen_quote_prozent)"
    )
    .eq("id", gruppeId)
    .single();

  if (!gruppe || gruppe.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const kitaYearStartMonth = gruppe.einrichtungen?.kita_year_start_month ?? 9;
  const darfBearbeiten = einrichtungId ? await canWriteBelegung(supabase, einrichtungId) : false;

  const [
    { data: geschwisterGruppen },
    { data: aktiveKinderRoh },
    { data: nachrueckerKinderRoh },
    { data: platzwerte },
    { data: alleKinderRoh },
    { data: gruppenPersonal },
    forecast,
  ] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select(KIND_SELECT)
      .eq("gruppe_id", gruppeId)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .order("geburtsdatum", { ascending: true }),
    supabase
      .from("kinder")
      .select(KIND_SELECT)
      .eq("gruppe_id", gruppeId)
      .in("status", ["nachruecker", "geplant"])
      .is("archived_at", null)
      .order("geburtsdatum", { ascending: true }),
    supabase
      .from("children_place_calculation_view")
      .select("platzwert")
      .eq("gruppe_id", gruppeId),
    // Für die Handlungsbedarf-Vorschau unten: die gleiche Berechnung wie auf /gruppen/vorschau,
    // aber nur für diese Gruppe gefiltert — braucht dafür Kinder der ganzen Einrichtung (Nachrücker
    // können für Vorschläge auch aus anderen Gruppen kommen).
    supabase
      .from("kinder")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort, ersetzt_kind_id")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .limit(3000),
    supabase
      .from("team")
      .select("id, vorname, nachname, wochenstunden, role_category")
      .eq("gruppe_id", gruppeId)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .order("nachname"),
    // Personal je Gruppe für die nächsten 12 Monate — gleiche Berechnung wie im Dashboard.
    buildForecastMonths(supabase, einrichtungId ?? "", toIsoDateString(new Date()), 12, false, true),
  ]);

  const aktiveKinder = (aktiveKinderRoh ?? []) as RohKind[];
  const nachrueckerKinder = (nachrueckerKinderRoh ?? []) as RohKind[];
  const allKindIds = [...aktiveKinder.map((k) => k.id), ...nachrueckerKinder.map((k) => k.id)];
  const [weightingLabels, aktuelleNotizen] = await Promise.all([
    resolveWeightingFactors(supabase, allKindIds),
    resolveAktuelleNotizen(supabase, allKindIds),
  ]);

  // „Kind B rückt für Kind A nach“: Namen für die Tabellen und Auswahl der noch nicht zugeordneten Nachrücker
  const kindNachId = new Map((alleKinderRoh ?? []).map((k) => [k.id, `${k.vorname} ${k.nachname}`]));
  const nachfolgerVon = new Map(
    (alleKinderRoh ?? []).filter((k) => k.ersetzt_kind_id).map((k) => [k.ersetzt_kind_id as string, `${k.vorname} ${k.nachname}`])
  );
  const nachrueckerOptionen: NachrueckerOption[] = (alleKinderRoh ?? [])
    .filter((k) => (k.status === "nachruecker" || k.status === "geplant") && !k.ersetzt_kind_id)
    .map((k) => ({ id: k.id, name: `${k.vorname} ${k.nachname}`, eintritt: k.eintritt }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  const belegtRaw = (platzwerte ?? []).reduce((sum, row) => sum + Number(row.platzwert), 0);
  const sollplatzeRounded = Math.round(Number(gruppe.sollplatze));
  const belegtRounded = Math.round(belegtRaw);
  const freiRounded = sollplatzeRounded - belegtRounded;
  const belegungsStatus = bestimmeBelegungsStatus(sollplatzeRounded, belegtRounded);

  // Sitzplätze 1..Sollplätze in kanonischer Alters-Reihenfolge — die Platznummer eines Kindes bleibt unabhängig
  // von der gewählten Anzeige-Sortierung gleich (siehe lib/gruppen/sitzplaetze.ts).
  const sitzplaetze = berechneSitzplaetze(
    sollplatzeRounded,
    aktiveKinder.map((k) => zuKindZeile(k, null, weightingLabels, aktuelleNotizen))
  );
  const aktiveKinderMitPlatz: KindZeile[] = sitzplaetze
    .filter((z): z is { platz: number; kind: KindZeile } => z.kind !== null)
    .map((z) => ({ ...z.kind, platz: z.platz, nachfolgerName: nachfolgerVon.get(z.kind.id) ?? null }));
  const nachrueckerKinderMitPlatz: KindZeile[] = nachrueckerKinder.map((k) => ({
    ...zuKindZeile(k, findePlatzVonKindId(sitzplaetze, k.ersetzt_kind_id), weightingLabels, aktuelleNotizen),
    ersetztName: k.ersetzt_kind_id ? (kindNachId.get(k.ersetzt_kind_id) ?? null) : null,
  }));

  // Standardansicht (kein Suchbegriff, keine gewählte Sortierung): das vollständige Sitzplatzbild inkl. freier
  // Plätze. Sobald gesucht oder anders sortiert wird, geht es um eine gezielte Kinderliste — freie Plätze passen
  // dort nicht mehr rein und werden ausgeblendet.
  const istStandardansicht = !q.trim() && sort === null;
  function fuerAnzeige(zeilen: KindZeile[], freieZeilen: { frei: true; platz: number }[]): KinderTableRow[] {
    if (istStandardansicht) {
      const kindPlaetze = new Set(zeilen.map((z) => z.platz));
      const nurFreie = freieZeilen.filter((f) => !kindPlaetze.has(f.platz));
      return [...zeilen, ...nurFreie].sort((a, b) => (a.platz ?? 0) - (b.platz ?? 0));
    }
    const gefiltert = q.trim()
      ? zeilen.filter((z) => `${z.vorname} ${z.nachname}`.toLowerCase().includes(q.trim().toLowerCase()))
      : zeilen;
    return sortiereFuerAnzeige(gefiltert, sort ?? "name", dir);
  }
  const freiePlaetze = sitzplaetze.filter((z) => z.kind === null).map((z) => ({ frei: true as const, platz: z.platz }));

  const hinweise: HinweisEintrag[] = aktiveKinder.flatMap((kind) => {
    const eintraege: HinweisEintrag[] = [];
    if (austrittWarnung(kind.austritt, kitaYearStartMonth) === "rot" && kind.austritt) {
      eintraege.push({
        id: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        grund: "Austritt",
        datum: kind.austritt,
        aktion: "Nachrücker prüfen",
      });
    }
    if (verlaengerungWarnung(kind.vertrag_gueltig_bis) === "rot" && kind.vertrag_gueltig_bis) {
      eintraege.push({
        id: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        grund: "Vertrag/Buchung läuft ab",
        datum: kind.vertrag_gueltig_bis,
        aktion: "Verlängerung oder Nachfolge klären",
      });
    }
    if (gruppe.gruppenart === "krippe" && krippenUebergangWarnung(kind.geburtsdatum) === "rot") {
      eintraege.push({
        id: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        grund: "Wird 3 — Krippe/Kindergarten prüfen",
        datum: kind.geburtsdatum,
      });
    }
    return eintraege;
  });

  // Handlungsbedarf: dieselbe Berechnung wie /gruppen/vorschau, hier auf die aktuelle Gruppe gefiltert und auf die
  // nächsten anstehenden Plätze verdichtet statt als volle Monatstabelle.
  const einrichtungsDaten = gruppe.einrichtungen;
  const auswaertigen =
    einrichtungsDaten?.bundesland_code === "bw" &&
    einrichtungsDaten.standort_gemeinde &&
    einrichtungsDaten.auswaertigen_quote_prozent !== null
      ? {
          standortGemeinde: einrichtungsDaten.standort_gemeinde,
          quoteProzent: Number(einrichtungsDaten.auswaertigen_quote_prozent),
        }
      : undefined;
  const heute = new Date();
  const vorschauStart = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));
  const { freiwerdende } = berechneBelegungsVorschau(
    (geschwisterGruppen ?? []).map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) })),
    (alleKinderRoh ?? []).map((k) => ({
      id: k.id,
      vorname: k.vorname,
      nachname: k.nachname,
      geburtsdatum: k.geburtsdatum,
      geschlecht: k.geschlecht,
      status: k.status,
      gruppeId: k.gruppe_id,
      eintritt: k.eintritt,
      austritt: k.austritt,
      wohnort: k.wohnort,
      ersetztKindId: k.ersetzt_kind_id,
    })),
    vorschauStart,
    HANDLUNGSBEDARF_MONATE,
    auswaertigen
  );
  const eigeneFreiwerdende = freiwerdende.filter((f) => f.gruppeId === gruppeId).slice(0, HANDLUNGSBEDARF_MAX_EINTRAEGE);

  const eigenerPersonalStatus = forecast[0]?.gruppenStatus.gruppen.find((g) => g.gruppeId === gruppeId) ?? null;
  const kritischerMonat = ersterKritischerMonat(
    forecast.map((m) => ({
      monat: `${m.month.slice(0, 7)}-01`,
      ampel: m.gruppenStatus.gruppen.find((g) => g.gruppeId === gruppeId)?.personal.ampel ?? ("gruen" as const),
    }))
  );

  const geschwister = geschwisterGruppen ?? [];
  const eigenerIndex = geschwister.findIndex((g) => g.id === gruppeId);
  const vorherige = eigenerIndex > 0 ? geschwister[eigenerIndex - 1] : null;
  const naechste = eigenerIndex >= 0 && eigenerIndex < geschwister.length - 1 ? geschwister[eigenerIndex + 1] : null;
  const baseQuery = q.trim() ? `q=${encodeURIComponent(q.trim())}` : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          {vorherige ? (
            <Link
              href={`/gruppen/${vorherige.id}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "print:hidden" })}
              aria-label={`Vorherige Gruppe: ${vorherige.name}`}
            >
              <ChevronLeft className="size-4" />
            </Link>
          ) : null}
          <h1 className="font-heading text-3xl tracking-tight text-primary">{gruppe.name}</h1>
          {naechste ? (
            <Link
              href={`/gruppen/${naechste.id}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "print:hidden" })}
              aria-label={`Nächste Gruppe: ${naechste.name}`}
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
          <Badge variant="secondary">{GRUPPENART_LABEL[gruppe.gruppenart] ?? gruppe.gruppenart}</Badge>
          {geschwister.length > 1 ? (
            <div className="flex items-center gap-1 print:hidden">
              {geschwister.map((g) => (
                <Link
                  key={g.id}
                  href={`/gruppen/${g.id}`}
                  className={buttonVariants({
                    variant: g.id === gruppeId ? "secondary" : "ghost",
                    size: "sm",
                  })}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          ) : null}
          {darfBearbeiten ? (
            <Link
              href={`/gruppen/${gruppeId}/bearbeiten`}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "print:hidden" })}
            >
              <Pencil className="size-3.5" />
              Gruppe bearbeiten
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Belegungsmanagement</p>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{belegtRounded}</span> von{" "}
          <span className="font-semibold tabular-nums">{sollplatzeRounded}</span> Plätzen belegt
        </span>
        <span className={belegungsStatus === "ueberbelegt" ? "font-medium text-destructive" : "text-muted-foreground"}>
          {belegungsStatus === "ueberbelegt" ? `${Math.abs(freiRounded)} überbelegt` : freiRounded > 0 ? `${freiRounded} frei` : "voll"}
        </span>
        {nachrueckerKinder.length > 0 ? (
          <span className="text-muted-foreground">
            {nachrueckerKinder.length} {nachrueckerKinder.length === 1 ? "Nachrücker/geplant" : "Nachrücker/geplant"}
          </span>
        ) : null}
      </p>

      {eigenerPersonalStatus ? (
        <GruppePersonalKarte
          status={eigenerPersonalStatus}
          modell={forecast[0].personal.modell}
          kritisch={kritischerMonat}
          belastbar={forecast[0].gruppenStatus.belastbar}
          personen={(gruppenPersonal ?? []).map((m) => ({
            id: m.id,
            name: [m.vorname, m.nachname].filter(Boolean).join(" "),
            wochenstunden: Number(m.wochenstunden ?? 0),
            kategorie: m.role_category,
          }))}
        />
      ) : null}

      <HinweiseBox eintraege={hinweise} />

      {eigeneFreiwerdende.length > 0 ? (
        <section id="nachfolge" className="flex flex-col gap-2 scroll-mt-20">
          <h2 className="font-heading text-sm font-medium text-muted-foreground">
            Nächste freie Plätze &amp; Nachfolge
          </h2>
          <ul className="flex flex-col gap-2">
            {eigeneFreiwerdende.map((f) => (
              <li key={f.monat} className="flex flex-col gap-2 rounded-xl border bg-secondary/30 p-4">
                <p className="text-sm font-medium">
                  {monatLang(f.monat)}: {f.anzahl === 1 ? "1 Platz wird frei" : `${f.anzahl} Plätze werden frei`}
                </p>
                {f.abgaenge.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {f.abgaenge.slice(0, NACHFOLGE_SICHTBAR).map((a) => (
                      <li key={a.kindId} className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Austritt: {a.name} ({formatDate(a.austritt)})</span>
                        <NachfolgerZuordnen
                          austretendId={a.kindId}
                          austretendName={a.name}
                          austritt={a.austritt}
                          nachfolger={a.nachfolger}
                          optionen={nachrueckerOptionen}
                          darfBearbeiten={darfBearbeiten}
                        />
                      </li>
                    ))}
                    {f.abgaenge.length > NACHFOLGE_SICHTBAR ? (
                      <li className="text-xs text-muted-foreground">
                        + {f.abgaenge.length - NACHFOLGE_SICHTBAR} weitere Austritte ({f.abgaenge.filter((a) => a.nachfolger).length} mit Nachfolger) — die Nachfolge ordnest du am jeweiligen Kind
                        zu.
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                {f.bereitsEingeplant.filter((e) => !f.abgaenge.some((a) => a.nachfolger?.kindId === e.kindId)).length > 0 ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Bereits vergeben an:{" "}
                    {f.bereitsEingeplant.filter((e) => !f.abgaenge.some((a) => a.nachfolger?.kindId === e.kindId)).map((e, i) => (
                      <span key={e.kindId}>
                        {i > 0 ? ", " : ""}
                        <Link href={`/kinder/${e.kindId}`} className="font-medium underline-offset-2 hover:underline">
                          {e.name}
                        </Link>{" "}
                        (Eintritt {formatDate(e.eintritt)})
                      </span>
                    ))}
                  </p>
                ) : null}
                {f.vorschlaege.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {f.vorschlaege.map((v) => (
                      <li key={v.kindId} className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/kinder/${v.kindId}`} className="font-medium underline-offset-2 hover:underline">
                          {v.name}
                        </Link>
                        <AmpelBadge
                          ampel={PASSUNG_AMPEL[v.einschaetzung]}
                          labels={{ [PASSUNG_AMPEL[v.einschaetzung]]: PASSUNG_LABEL[v.einschaetzung] }}
                        />
                        {v.eintritt ? (
                          <span className="text-xs text-muted-foreground">Eintritt geplant {formatDate(v.eintritt)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : f.bereitsEingeplant.length < f.anzahl ? (
                  <p className="text-xs text-muted-foreground">Kein passender Nachrücker vorgemerkt — prüfe die Warteliste.</p>
                ) : null}
              </li>
            ))}
          </ul>
          <Link href="/gruppen/vorschau" className="self-start text-xs text-primary underline-offset-2 hover:underline print:hidden">
            Alle Gruppen &amp; mehr Monate ansehen →
          </Link>
        </section>
      ) : null}

      <form className="flex flex-wrap items-end gap-3 print:hidden" method="get">
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        {sort ? <input type="hidden" name="dir" value={dir} /> : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted-foreground">
            Suche
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name…"
            className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
          />
        </div>
        <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Filtern
        </button>
        {!istStandardansicht ? (
          <Link href={`/gruppen/${gruppeId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Zurücksetzen (alle Plätze anzeigen)
          </Link>
        ) : null}
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/5 p-4">
          <h2 className="font-heading text-lg text-emerald-700 dark:text-emerald-400">Aktive Kinder</h2>
          <KinderTable
            rows={fuerAnzeige(aktiveKinderMitPlatz, freiePlaetze)}
            kitaYearStartMonth={kitaYearStartMonth}
            highlightAustritt
            emptyMessage="Noch keine aktiven Kinder in dieser Gruppe."
            sort={sort}
            dir={dir}
            baseQuery={baseQuery}
          />
        </section>
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-sky-500/60 bg-sky-500/5 p-4">
          <h2 className="font-heading text-lg text-sky-700 dark:text-sky-400">Nachrücker &amp; geplante Kinder</h2>
          <KinderTable
            rows={fuerAnzeige(nachrueckerKinderMitPlatz, [])}
            kitaYearStartMonth={kitaYearStartMonth}
            emptyMessage="Keine Nachrücker oder geplanten Kinder für diese Gruppe."
            sort={sort}
            dir={dir}
            baseQuery={baseQuery}
          />
        </section>
      </div>
    </div>
  );
}
