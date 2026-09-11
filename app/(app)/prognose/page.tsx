import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { ForecastTable } from "@/components/forecast/forecast-table";

const DEFAULT_MONTH_COUNT = 12;
const MAX_MONTH_COUNT = 18;

function kitajahrStart(today: Date, kitaYearStartMonth: number): Date {
  const currentMonth = today.getUTCMonth() + 1;
  const year =
    currentMonth >= kitaYearStartMonth
      ? today.getUTCFullYear()
      : today.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, kitaYearStartMonth - 1, 1));
}

export default async function PrognosePage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; monate?: string }>;
}) {
  const { von, monate } = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("kita_year_start_month")
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  const defaultVon = toIsoDateString(
    kitajahrStart(new Date(), einrichtung?.kita_year_start_month ?? 9)
  );
  const vonMonth = von ?? defaultVon;
  const monthCount = Math.min(
    MAX_MONTH_COUNT,
    Math.max(1, Number(monate) || DEFAULT_MONTH_COUNT)
  );

  const months = einrichtungId
    ? await buildForecastMonths(supabase, einrichtungId, vonMonth, monthCount)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Prognose
        </h1>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Belegung und Personalbedarf für {monthCount} Monate ab dem
        Kitajahr-Start — Grundlage für die vorausschauende Personalplanung.
      </p>

      {months.length > 0 ? (
        <ForecastTable months={months} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Daten verfügbar.
        </p>
      )}
    </div>
  );
}
