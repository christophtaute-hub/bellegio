import { Users, Scale, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildCompositionMatrix,
  buildKpis,
} from "@/lib/dashboard/presence";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { CompositionTable } from "@/components/dashboard/composition-table";

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

  const rows = einrichtungId
    ? await getKinderPresenceAtDate(supabase, einrichtungId, stichtag)
    : [];
  const matrix = buildCompositionMatrix(rows);
  const kpis = buildKpis(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-primary">Dashboard</h1>
      </div>

      <StichtagPicker basePath="/dashboard" stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile
          label="Kinder am Stichtag"
          value={String(kpis.kinderGesamt)}
          icon={Users}
        />
        <StatTile
          label="Gewichtete Buchungsstunden"
          value={formatGewichtet(kpis.gewichteteSumme)}
          icon={Scale}
        />
        <StatTile
          label="Ohne Buchungszeit"
          value={String(kpis.ohneBuchungszeit)}
          icon={AlertTriangle}
          tone={kpis.ohneBuchungszeit > 0 ? "warn" : "default"}
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
