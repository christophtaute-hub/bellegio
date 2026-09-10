import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { KinderTable, type KinderTableRow } from "@/components/gruppen/kinder-table";

const KIND_SELECT =
  "id, platznummer, vorname, nachname, geburtsdatum, eintritt, austritt, notizen, status, booking_time_bands(label)";

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
        .order("platznummer"),
      supabase
        .from("kinder")
        .select(KIND_SELECT)
        .eq("gruppe_id", gruppeId)
        .eq("status", "nachruecker")
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("children_place_calculation_view")
        .select("platzwert")
        .eq("gruppe_id", gruppeId),
    ]);

  const belegt = (platzwerte ?? []).reduce(
    (sum, row) => sum + Number(row.platzwert),
    0
  );
  const frei = Number(gruppe.sollplatze) - belegt;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl text-primary">{gruppe.name}</h1>
        <Badge variant="secondary">
          {GRUPPENART_LABEL[gruppe.gruppenart] ?? gruppe.gruppenart}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-6">
        <Metric label="Sollplätze" value={String(gruppe.sollplatze)} />
        <Metric label="Belegt" value={belegt.toFixed(1)} />
        <Metric
          label={frei < 0 ? "Überbelegt" : "Frei"}
          value={Math.abs(frei).toFixed(1)}
          tone={frei < 0 ? "warn" : "ok"}
        />
        <Metric
          label="Nachrücker"
          value={String(nachrueckerKinder?.length ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg">Aktive Kinder</h2>
          <KinderTable
            rows={(aktiveKinder ?? []) as unknown as KinderTableRow[]}
            kitaYearStartMonth={kitaYearStartMonth}
            highlightAustritt
            emptyMessage="Noch keine aktiven Kinder in dieser Gruppe."
          />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg">Nachrücker</h2>
          <KinderTable
            rows={(nachrueckerKinder ?? []) as unknown as KinderTableRow[]}
            kitaYearStartMonth={kitaYearStartMonth}
            emptyMessage="Keine Nachrücker für diese Gruppe."
          />
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "text-xl font-medium text-destructive"
            : "text-xl font-medium"
        }
      >
        {value}
      </p>
    </div>
  );
}
