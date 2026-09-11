import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildKpis,
  buildBelegungKennzahlen,
  type KpiSummary,
  type BelegungKennzahlen,
} from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  buildPersonalplanung,
  type Personalplanung,
} from "@/lib/team/anstellungsschluessel";

export type ForecastMonth = {
  month: string;
  kpis: KpiSummary;
  belegung: BelegungKennzahlen;
  personal: Personalplanung;
};

function monthStart(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return toIsoDateString(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

export async function buildForecastMonths(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  startMonth: string,
  monthCount: number
): Promise<ForecastMonth[]> {
  const [{ data: gruppen }] = await Promise.all([
    supabase
      .from("gruppen")
      .select("sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null),
  ]);

  const gruppenAnzahl = gruppen?.length ?? 0;
  const gruppenSollplatzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );

  const start = monthStart(startMonth);
  const months = Array.from({ length: monthCount }, (_, i) =>
    toIsoDateString(addMonthsUtc(parseIsoDate(start), i))
  );

  return Promise.all(
    months.map(async (month) => {
      const [kinderRows, teamRows] = await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, month),
        getTeamPresenceForMonth(supabase, einrichtungId, month),
      ]);

      const kpis = buildKpis(kinderRows);
      const belegung = buildBelegungKennzahlen(kinderRows, gruppenSollplatzeSumme);
      const personal = buildPersonalplanung(
        teamRows,
        kpis.gewichteteSumme,
        gruppenAnzahl
      );

      return { month, kpis, belegung, personal };
    })
  );
}
