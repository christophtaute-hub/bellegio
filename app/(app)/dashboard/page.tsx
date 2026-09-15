import { Users, Scale, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildCompositionMatrix,
  buildKpis,
} from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  getStaffingRules,
  buildPersonalplanung,
} from "@/lib/team/anstellungsschluessel";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { MetricCard } from "@/components/ui/metric-card";
import { CompositionTable } from "@/components/dashboard/composition-table";

const TREND_MONTHS = 6;

function formatGewichtet(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stichtag?: string }>;
}) {
  const { stichtag: stichtagParam } = await searchParams;
  const stichtag = stichtagParam ?? toIsoDateString(new Date());
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [rows, teamPresenceRows, { data: einrichtung }] = einrichtungId
    ? await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
        getTeamPresenceForMonth(supabase, einrichtungId, stichtag),
        supabase
          .from("einrichtungen")
          .select("empfohlener_anstellungsschluessel, vollzeit_wochenstunden, bundesland_code")
          .eq("id", einrichtungId)
          .single(),
      ])
    : [[], [], { data: null }];
  const matrix = buildCompositionMatrix(rows);
  const kpis = buildKpis(rows);
  const staffingRules = await getStaffingRules(
    supabase,
    einrichtung?.bundesland_code ?? "by"
  );
  const personal = buildPersonalplanung(
    teamPresenceRows,
    kpis.gewichteteKinderzahl,
    kpis.gewichteteKinderzahlFachkraftquote,
    einrichtung?.vollzeit_wochenstunden ?? 39,
    einrichtung?.empfohlener_anstellungsschluessel ?? 10.0,
    staffingRules
  );

  const trendMonths = Array.from({ length: TREND_MONTHS }, (_, i) =>
    toIsoDateString(addMonthsUtc(parseIsoDate(stichtag), i - (TREND_MONTHS - 1)))
  );
  const trendData = einrichtungId
    ? await Promise.all(
        trendMonths.map(async (month) => {
          const [monthRows, monthTeamRows] = await Promise.all([
            getKinderPresenceAtDate(supabase, einrichtungId, month),
            getTeamPresenceForMonth(supabase, einrichtungId, month),
          ]);
          const monthKpis = buildKpis(monthRows);
          const monthPersonal = buildPersonalplanung(
            monthTeamRows,
            monthKpis.gewichteteKinderzahl,
            monthKpis.gewichteteKinderzahlFachkraftquote,
            einrichtung?.vollzeit_wochenstunden ?? 39,
            einrichtung?.empfohlener_anstellungsschluessel ?? 10.0,
            staffingRules
          );
          return { kpis: monthKpis, personal: monthPersonal };
        })
      )
    : [];
  const trendKinderGesamt = trendData.map((t) => t.kpis.kinderGesamt);
  const trendGewichteteSumme = trendData.map((t) => t.kpis.gewichteteSumme);
  const trendOhneBuchungszeit = trendData.map((t) => t.kpis.ohneBuchungszeit);
  const trendAnstellungsschluessel = trendData.map(
    (t) => t.personal.anstellungsschluessel ?? 0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Dashboard</h1>
      </div>

      <StichtagPicker basePath="/dashboard" stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Kinder am Stichtag"
          value={String(kpis.kinderGesamt)}
          icon={<Users />}
          trend={trendKinderGesamt}
        />
        <MetricCard
          label="Gewichtete Buchungsstunden"
          value={formatGewichtet(kpis.gewichteteSumme)}
          icon={<Scale />}
          trend={trendGewichteteSumme}
        />
        <MetricCard
          label="Anstellungsschlüssel"
          value={
            personal.anstellungsschluessel !== null
              ? `1 : ${formatGewichtet(personal.anstellungsschluessel)}`
              : "–"
          }
          icon={<Scale />}
          tone={!personal.mindestschluesselOk ? "warn" : "default"}
          trend={trendAnstellungsschluessel}
        />
        <MetricCard
          label="Ohne Buchungszeit"
          value={String(kpis.ohneBuchungszeit)}
          icon={<AlertTriangle />}
          tone={kpis.ohneBuchungszeit > 0 ? "warn" : "default"}
          trend={trendOhneBuchungszeit}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">
          Zusammensetzung nach Buchungszeit und Gewichtungsfaktor
        </h2>
        <CompositionTable matrix={matrix} />
      </div>
    </div>
  );
}
