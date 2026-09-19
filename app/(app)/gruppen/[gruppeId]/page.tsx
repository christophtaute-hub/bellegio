import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat-tile";
import { KinderTable, type KinderTableRow } from "@/components/gruppen/kinder-table";
import { HinweiseBox, type HinweisEintrag } from "@/components/gruppen/hinweise-box";
import { austrittWarnung, verlaengerungWarnung } from "@/lib/kita-datum";

const KIND_SELECT =
  "id, platznummer, vorname, nachname, geburtsdatum, geschlecht, eintritt, austritt, vertrag_gueltig_bis, notizen, status, booking_time_bands(label)";

async function resolveWeightingFactorLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kindIds: string[]
): Promise<Map<string, string>> {
  if (kindIds.length === 0) return new Map();

  const { data } = await supabase
    .from("kind_weighting_factors")
    .select("kind_id, weighting_factors(label, factor)")
    .in("kind_id", kindIds);

  const byKind = new Map<string, string>();
  const maxFactor = new Map<string, number>();
  for (const row of data ?? []) {
    const factor = row.weighting_factors?.factor ?? 0;
    const current = maxFactor.get(row.kind_id) ?? -1;
    if (factor > current && row.weighting_factors) {
      maxFactor.set(row.kind_id, factor);
      byKind.set(row.kind_id, row.weighting_factors.label);
    }
  }
  return byKind;
}

function withWeightingLabels(
  kinder: unknown[] | null,
  labels: Map<string, string>
): KinderTableRow[] {
  return ((kinder ?? []) as unknown as KinderTableRow[]).map((kind) => ({
    ...kind,
    weighting_factor_label: labels.get(kind.id) ?? null,
  }));
}

export default async function GruppeDetailPage({
  params,
}: {
  params: Promise<{ gruppeId: string }>;
}) {
  const { gruppeId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: gruppe } = await supabase
    .from("gruppen")
    .select("id, name, gruppenart, sollplatze, einrichtung_id, einrichtungen(kita_year_start_month)")
    .eq("id", gruppeId)
    .single();

  if (!gruppe || gruppe.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const kitaYearStartMonth = gruppe.einrichtungen?.kita_year_start_month ?? 9;

  const [{ data: aktiveKinder }, { data: nachrueckerKinder }, { data: platzwerte }] =
    await Promise.all([
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
    ]);

  const allKindIds = [
    ...(aktiveKinder ?? []).map((k) => k.id),
    ...(nachrueckerKinder ?? []).map((k) => k.id),
  ];
  const weightingLabels = await resolveWeightingFactorLabels(
    supabase,
    allKindIds
  );

  const belegtRaw = (platzwerte ?? []).reduce(
    (sum, row) => sum + Number(row.platzwert),
    0
  );
  const sollplatzeRounded = Math.round(Number(gruppe.sollplatze));
  const belegtRounded = Math.round(belegtRaw);
  const freiRounded = sollplatzeRounded - belegtRounded;

  const geschlechtAnzahl = (geschlecht: string) =>
    (aktiveKinder ?? []).filter((k) => k.geschlecht === geschlecht).length;
  const verteilung = [
    { kuerzel: "w", anzahl: geschlechtAnzahl("weiblich") },
    { kuerzel: "m", anzahl: geschlechtAnzahl("maennlich") },
    { kuerzel: "d", anzahl: geschlechtAnzahl("divers") },
  ]
    .filter((eintrag) => eintrag.anzahl > 0)
    .map((eintrag) => `${eintrag.anzahl} ${eintrag.kuerzel}`)
    .join(" · ");
  const ohneAngabe = geschlechtAnzahl("keine_angabe");

  const hinweise: HinweisEintrag[] = (aktiveKinder ?? []).flatMap((kind) => {
    const eintraege: HinweisEintrag[] = [];
    if (austrittWarnung(kind.austritt, kitaYearStartMonth) === "rot" && kind.austritt) {
      eintraege.push({
        id: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        grund: "Austritt",
        datum: kind.austritt,
      });
    }
    if (verlaengerungWarnung(kind.vertrag_gueltig_bis) === "rot" && kind.vertrag_gueltig_bis) {
      eintraege.push({
        id: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        grund: "Vertrag/Buchung läuft ab",
        datum: kind.vertrag_gueltig_bis,
      });
    }
    return eintraege;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl tracking-tight text-primary">{gruppe.name}</h1>
          <Badge variant="secondary">
            {GRUPPENART_LABEL[gruppe.gruppenart] ?? gruppe.gruppenart}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Belegungsmanagement</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Sollplätze" value={String(sollplatzeRounded)} />
        <StatTile label="Belegt" value={String(belegtRounded)} />
        <StatTile
          label={freiRounded < 0 ? "Überbelegt" : "Frei"}
          value={String(Math.abs(freiRounded))}
          tone={freiRounded < 0 ? "warn" : "default"}
        />
        <StatTile
          label="Nachrücker/geplant"
          value={String(nachrueckerKinder?.length ?? 0)}
        />
        <StatTile
          label={ohneAngabe > 0 ? `Geschlecht (${ohneAngabe} ohne Angabe)` : "Geschlecht (aktive Kinder)"}
          value={verteilung || "–"}
        />
      </div>

      <HinweiseBox eintraege={hinweise} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/5 p-4">
          <h2 className="font-heading text-lg text-emerald-700 dark:text-emerald-400">
            Aktive Kinder
          </h2>
          <KinderTable
            rows={withWeightingLabels(aktiveKinder, weightingLabels)}
            kitaYearStartMonth={kitaYearStartMonth}
            highlightAustritt
            emptyMessage="Noch keine aktiven Kinder in dieser Gruppe."
          />
        </section>
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-sky-500/60 bg-sky-500/5 p-4">
          <h2 className="font-heading text-lg text-sky-700 dark:text-sky-400">
            Nachrücker &amp; geplante Kinder
          </h2>
          <KinderTable
            rows={withWeightingLabels(nachrueckerKinder, weightingLabels)}
            kitaYearStartMonth={kitaYearStartMonth}
            emptyMessage="Keine Nachrücker oder geplanten Kinder für diese Gruppe."
          />
        </section>
      </div>
    </div>
  );
}
