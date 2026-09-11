import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type TeamPresenceRow = {
  team_id: string;
  vorname: string | null;
  nachname: string | null;
  rolle: string | null;
  wochenstunden: number | null;
  fachkraft: boolean;
};

export async function getTeamPresenceAtDate(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string
): Promise<TeamPresenceRow[]> {
  const { data, error } = await supabase.rpc("team_presence_at_date", {
    p_einrichtung_id: einrichtungId,
    p_stichtag: stichtag,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const ANSTELLUNGSSCHLUESSEL_SOLL = 11.0;
const ANSTELLUNGSSCHLUESSEL_GELB_GRENZE = 11.5;
const FACHKRAFTQUOTE_SOLL = 0.5;
const FACHKRAFTQUOTE_GELB_TOLERANZ = 0.1;

export type Ampel = "gruen" | "gelb" | "rot";

export type Anstellungsschluessel = {
  gewichteteSumme: number;
  vollzeitWochenstunden: number;
  sollVzae: number;
  sollAz: number;
  istAz: number;
  istVzae: number;
  anstellungsschluesselIst: number | null;
  differenzstunden: number;
  differenzVzae: number;
  fachkraftstundenIst: number;
  sollFachkraftstunden: number;
  fachkraftquoteIst: number | null;
  ampel: Ampel;
};

export function buildAnstellungsschluessel(
  teamRows: TeamPresenceRow[],
  gewichteteSumme: number,
  vollzeitWochenstunden: number
): Anstellungsschluessel {
  const sollVzae = gewichteteSumme / ANSTELLUNGSSCHLUESSEL_SOLL;
  const sollAz = sollVzae * vollzeitWochenstunden;

  const istAz = teamRows.reduce(
    (sum, row) => sum + (row.wochenstunden ?? 0),
    0
  );
  const istVzae = istAz / vollzeitWochenstunden;

  const anstellungsschluesselIst = istVzae > 0 ? gewichteteSumme / istVzae : null;

  const differenzstunden = istAz - sollAz;
  const differenzVzae = differenzstunden / vollzeitWochenstunden;

  const fachkraftstundenIst = teamRows
    .filter((row) => row.fachkraft)
    .reduce((sum, row) => sum + (row.wochenstunden ?? 0), 0);
  const sollFachkraftstunden = FACHKRAFTQUOTE_SOLL * sollAz;
  const fachkraftquoteIst = istAz > 0 ? fachkraftstundenIst / istAz : null;

  const anstellungsschluesselOk =
    anstellungsschluesselIst !== null &&
    anstellungsschluesselIst <= ANSTELLUNGSSCHLUESSEL_SOLL;
  const anstellungsschluesselGrenzwertig =
    anstellungsschluesselIst !== null &&
    anstellungsschluesselIst <= ANSTELLUNGSSCHLUESSEL_GELB_GRENZE;

  const fachkraftOk = fachkraftstundenIst >= sollFachkraftstunden;
  const fachkraftGrenzwertig =
    fachkraftstundenIst >= sollFachkraftstunden * (1 - FACHKRAFTQUOTE_GELB_TOLERANZ);

  let ampel: Ampel;
  if (gewichteteSumme === 0) {
    ampel = "gruen";
  } else if (anstellungsschluesselOk && fachkraftOk) {
    ampel = "gruen";
  } else if (anstellungsschluesselGrenzwertig && fachkraftGrenzwertig) {
    ampel = "gelb";
  } else {
    ampel = "rot";
  }

  return {
    gewichteteSumme,
    vollzeitWochenstunden,
    sollVzae,
    sollAz,
    istAz,
    istVzae,
    anstellungsschluesselIst,
    differenzstunden,
    differenzVzae,
    fachkraftstundenIst,
    sollFachkraftstunden,
    fachkraftquoteIst,
    ampel,
  };
}
