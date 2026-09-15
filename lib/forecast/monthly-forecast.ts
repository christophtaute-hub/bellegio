import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildKpis,
  buildBelegungKennzahlen,
  buildCompositionMatrix,
  type KpiSummary,
  type BelegungKennzahlen,
  type CompositionMatrix,
} from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  getStaffingRules,
  buildPersonalplanung,
  type Personalplanung,
} from "@/lib/team/anstellungsschluessel";

export type ZeitkategorieMonat =
  | { modell: "bayern"; matrix: CompositionMatrix }
  | {
      modell: "bw";
      gruppen: { name: string; betriebsform: string | null; altersmischung: boolean }[];
    }
  | {
      modell: "nrw";
      gruppen: { name: string; gruppenform: string | null; buchungszeitStunden: number | null }[];
    };

export type ForecastMonth = {
  month: string;
  kpis: KpiSummary;
  belegung: BelegungKennzahlen;
  personal: Personalplanung;
  zeitkategorie: ZeitkategorieMonat;
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
  const [{ data: gruppen }, { data: einrichtung }] = await Promise.all([
    supabase
      .from("gruppen")
      .select("sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null),
    supabase
      .from("einrichtungen")
      .select("empfohlener_anstellungsschluessel, vollzeit_wochenstunden, bundesland_code")
      .eq("id", einrichtungId)
      .single(),
  ]);

  const gruppenSollplatzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );
  const empfohlenerSchluesselWert =
    einrichtung?.empfohlener_anstellungsschluessel ?? 10.0;
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const staffingRules = await getStaffingRules(supabase, bundeslandCode);

  // BW/NRW: die Gruppen-Konfiguration (Betriebsform/Gruppenform) wird nicht
  // historisiert — für jeden Monat im Zeitraum wird daher die aktuelle
  // Konfiguration angezeigt, auch für vergangene Monate.
  const [{ data: bwGruppen }, { data: nrwGruppen }] = await Promise.all([
    bundeslandCode === "bw"
      ? supabase
          .from("gruppen")
          .select("name, bw_betriebsform, bw_altersmischung")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
      : Promise.resolve({ data: null }),
    bundeslandCode === "nrw"
      ? supabase
          .from("gruppen")
          .select("name, nrw_gruppenform, nrw_buchungszeit_stunden")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
      : Promise.resolve({ data: null }),
  ]);

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
        kpis.gewichteteKinderzahl,
        kpis.gewichteteKinderzahlFachkraftquote,
        vollzeitWochenstunden,
        empfohlenerSchluesselWert,
        staffingRules
      );

      const zeitkategorie: ZeitkategorieMonat =
        bundeslandCode === "bw"
          ? {
              modell: "bw",
              gruppen: (bwGruppen ?? []).map((g) => ({
                name: g.name,
                betriebsform: g.bw_betriebsform,
                altersmischung: g.bw_altersmischung,
              })),
            }
          : bundeslandCode === "nrw"
            ? {
                modell: "nrw",
                gruppen: (nrwGruppen ?? []).map((g) => ({
                  name: g.name,
                  gruppenform: g.nrw_gruppenform,
                  buchungszeitStunden: g.nrw_buchungszeit_stunden,
                })),
              }
            : { modell: "bayern", matrix: buildCompositionMatrix(kinderRows) };

      return { month, kpis, belegung, personal, zeitkategorie };
    })
  );
}
