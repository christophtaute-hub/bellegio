import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type TeamPresenceRow = {
  team_id: string;
  vorname: string | null;
  nachname: string | null;
  rolle: string | null;
  role_category: string | null;
  wochenstunden: number | null;
};

export async function getTeamPresenceForMonth(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  month: string
): Promise<TeamPresenceRow[]> {
  const { data, error } = await supabase.rpc("team_presence_for_month", {
    p_einrichtung_id: einrichtungId,
    p_month: month,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const MINDESTSCHLUESSEL = 11.0;
const EMPFOHLENER_SCHLUESSEL = 10.0;

export type Ampel = "gruen" | "gelb" | "rot";

/**
 * Formelkette 1:1 aus der real genutzten Personalbelegungsliste übernommen
 * (nicht algebraisch vereinfacht — die Zwischenwerte buchungenGew/sollFk
 * werden einzeln angezeigt und müssen mit dem Excel-Original übereinstimmen).
 * gruppenAnzahl generalisiert die dort fest verdrahtete "5" (Anzahl Gruppen
 * dieser einen Einrichtung) auf die tatsächliche Gruppenzahl der Einrichtung.
 */
export type Personalplanung = {
  buchungenGew: number;
  sollFk: number;
  istFk: number;
  istEk: number;
  istAzGesamt: number;
  gruppenAnzahl: number;
  istAzProTagGesamt: number;
  anstellungsschluessel: number | null;
  mindestschluesselOk: boolean;
  empfohlenerSchluesselOk: boolean;
  qualifikationsschluesselOk: boolean;
  ampel: Ampel;
};

export function buildPersonalplanung(
  teamRows: TeamPresenceRow[],
  gewichteteSumme: number,
  gruppenAnzahl: number
): Personalplanung {
  const buchungenGew = 4 * gewichteteSumme;
  const sollFk = buchungenGew / 11 / 2 * 5;

  const istFk = teamRows
    .filter((row) => row.role_category === "fk")
    .reduce((sum, row) => sum + (row.wochenstunden ?? 0), 0);
  const istEk = teamRows
    .filter((row) => row.role_category === "ek")
    .reduce((sum, row) => sum + (row.wochenstunden ?? 0), 0);
  const istAzGesamt = istFk + istEk;
  const istAzProTagGesamt = gruppenAnzahl > 0 ? istAzGesamt / gruppenAnzahl : 0;

  const anstellungsschluessel =
    istAzProTagGesamt > 0
      ? Math.round((buchungenGew / istAzProTagGesamt) * 100) / 100
      : null;

  const mindestschluesselOk =
    anstellungsschluessel !== null && anstellungsschluessel <= MINDESTSCHLUESSEL;
  const empfohlenerSchluesselOk =
    anstellungsschluessel !== null && anstellungsschluessel <= EMPFOHLENER_SCHLUESSEL;
  const qualifikationsschluesselOk = istFk >= sollFk;

  let ampel: Ampel;
  if (gewichteteSumme === 0) {
    ampel = "gruen";
  } else if (mindestschluesselOk && qualifikationsschluesselOk) {
    ampel = "gruen";
  } else if (mindestschluesselOk) {
    ampel = "gelb";
  } else {
    ampel = "rot";
  }

  return {
    buchungenGew,
    sollFk,
    istFk,
    istEk,
    istAzGesamt,
    gruppenAnzahl,
    istAzProTagGesamt,
    anstellungsschluessel,
    mindestschluesselOk,
    empfohlenerSchluesselOk,
    qualifikationsschluesselOk,
    ampel,
  };
}
