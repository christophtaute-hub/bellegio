import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildKpis,
  buildBelegungKennzahlen,
  buildCompositionMatrix,
  buildKpisByGruppenart,
  type KpiSummary,
  type BelegungKennzahlen,
  type CompositionMatrix,
  type KpisByGruppenart,
} from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth } from "@/lib/team/anstellungsschluessel";
import {
  ladePersonalplanungKontext,
  berechnePersonalplanung,
  type PersonalplanungErgebnis,
} from "@/lib/team/personalplanung";

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
  /** Ungewichtete/gewichtete Kennzahlen je Gruppenart (Krippe/Kindergarten/…) — bislang
   * nur in der Bayern-Ansicht ausgewertet, da "gewichtet" in BW/NRW kein Konzept ist. */
  kpisByGruppenart: KpisByGruppenart[];
  belegung: BelegungKennzahlen;
  /** Bundesland-abhängig: Bayern (Anstellungsschlüssel), BW (VZÄ-Soll), NRW (Fachkraft-/Ergänzungskraft-Stunden). */
  personal: PersonalplanungErgebnis;
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
  const [{ data: gruppen }, { data: einrichtung }, personalKontext] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null),
    supabase
      .from("einrichtungen")
      .select("bundesland_code")
      .eq("id", einrichtungId)
      .single(),
    ladePersonalplanungKontext(supabase, einrichtungId),
  ]);

  const gruppenSollplatzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

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
      const kpisByGruppenart = buildKpisByGruppenart(kinderRows, gruppen ?? []);
      const belegung = buildBelegungKennzahlen(kinderRows, gruppenSollplatzeSumme);
      const personal = berechnePersonalplanung(personalKontext, teamRows, {
        gewichteteKinderzahl: kpis.gewichteteKinderzahl,
        gewichteteKinderzahlFachkraftquote: kpis.gewichteteKinderzahlFachkraftquote,
      });

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

      return { month, kpis, kpisByGruppenart, belegung, personal, zeitkategorie };
    })
  );
}
