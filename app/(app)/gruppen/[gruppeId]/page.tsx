import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { buttonVariants } from "@/components/ui/button";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat-tile";
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
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .limit(3000),
  ]);

  const aktiveKinder = (aktiveKinderRoh ?? []) as RohKind[];
  const nachrueckerKinder = (nachrueckerKinderRoh ?? []) as RohKind[];
  const allKindIds = [...aktiveKinder.map((k) => k.id), ...nachrueckerKinder.map((k) => k.id)];
  const [weightingLabels, aktuelleNotizen] = await Promise.all([
    resolveWeightingFactors(supabase, allKindIds),
    resolveAktuelleNotizen(supabase, allKindIds),
  ]);

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
    .map((z) => ({ ...z.kind, platz: z.platz }));
  const nachrueckerKinderMitPlatz: KindZeile[] = nachrueckerKinder.map((k) =>
    zuKindZeile(k, findePlatzVonKindId(sitzplaetze, k.ersetzt_kind_id), weightingLabels, aktuelleNotizen)
  );

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

  const geschlechtAnzahl = (geschlecht: string) => aktiveKinder.filter((k) => k.geschlecht === geschlecht).length;
  const verteilung = [
    { kuerzel: "w", anzahl: geschlechtAnzahl("weiblich") },
    { kuerzel: "m", anzahl: geschlechtAnzahl("maennlich") },
    { kuerzel: "d", anzahl: geschlechtAnzahl("divers") },
  ]
    .filter((eintrag) => eintrag.anzahl > 0)
    .map((eintrag) => `${eintrag.anzahl} ${eintrag.kuerzel}`)
    .join(" · ");
  const ohneAngabe = geschlechtAnzahl("keine_angabe");

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
    })),
    vorschauStart,
    HANDLUNGSBEDARF_MONATE,
    auswaertigen
  );
  const eigeneFreiwerdende = freiwerdende.filter((f) => f.gruppeId === gruppeId).slice(0, HANDLUNGSBEDARF_MAX_EINTRAEGE);

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Sollplätze" value={String(sollplatzeRounded)} />
        <StatTile label="Belegt" value={String(belegtRounded)} />
        <StatTile
          label={belegungsStatus === "ueberbelegt" ? "Überbelegt" : "Frei"}
          value={String(Math.abs(freiRounded))}
          tone={belegungsStatus === "ueberbelegt" ? "warn" : "default"}
        />
        <StatTile label="Nachrücker/geplant" value={String(nachrueckerKinder.length)} />
        <StatTile
          label={ohneAngabe > 0 ? `Geschlecht (${ohneAngabe} ohne Angabe)` : "Geschlecht (aktive Kinder)"}
          value={verteilung || "–"}
        />
      </div>

      <HinweiseBox eintraege={hinweise} />

      {eigeneFreiwerdende.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-medium text-muted-foreground">
            Nächste freie Plätze &amp; Nachrücker-Vorschläge
          </h2>
          <ul className="flex flex-col gap-2">
            {eigeneFreiwerdende.map((f) => (
              <li key={f.monat} className="flex flex-col gap-2 rounded-xl border bg-secondary/30 p-4">
                <p className="text-sm font-medium">
                  {monatLang(f.monat)}: {f.anzahl === 1 ? "1 Platz wird frei" : `${f.anzahl} Plätze werden frei`}
                </p>
                {f.abgaenge.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Austritt: {f.abgaenge.map((a) => `${a.name} (${formatDate(a.austritt)})`).join(", ")}
                  </p>
                ) : null}
                {f.bereitsEingeplant.length > 0 ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Bereits vergeben an:{" "}
                    {f.bereitsEingeplant.map((e, i) => (
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
