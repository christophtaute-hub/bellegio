import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth, type Ampel } from "@/lib/team/anstellungsschluessel";
import { ladePersonalplanungKontext, berechnePersonalplanung } from "@/lib/team/personalplanung";
import { personalKennzahl, type PersonalKennzahl } from "@/lib/dashboard/personal-kennzahl";

export type EinrichtungKennzahlen = {
  kinderGesamt: number;
  sollplaetze: number;
  freiePlaetze: number;
  ampel: Ampel;
  personal: PersonalKennzahl;
};

/** Kennzahlen für die Mini-Dashboard-Kachel einer Einrichtung. Lädt die Kinder-Presence nur einmal und gibt sie
 * sowohl an die Belegung als auch an die Personalberechnung weiter (getPersonalplanungFuerEinrichtung würde sie für
 * Bayern ein zweites Mal laden). */
export async function ladeEinrichtungKennzahlen(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string
): Promise<EinrichtungKennzahlen> {
  const [{ data: gruppen }, kontext, kinderRows, teamRows] = await Promise.all([
    supabase.from("gruppen").select("sollplatze").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    ladePersonalplanungKontext(supabase, einrichtungId, stichtag),
    getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
    getTeamPresenceForMonth(supabase, einrichtungId, stichtag),
  ]);
  const kpis = buildKpis(kinderRows);
  const personal = berechnePersonalplanung(kontext, teamRows, {
    gewichteteKinderzahl: kpis.gewichteteKinderzahl,
    gewichteteKinderzahlFachkraftquote: kpis.gewichteteKinderzahlFachkraftquote,
  });
  const sollplaetze = (gruppen ?? []).reduce((summe, g) => summe + Number(g.sollplatze), 0);
  return {
    kinderGesamt: kpis.kinderGesamt,
    sollplaetze,
    freiePlaetze: Math.max(0, sollplaetze - kpis.kinderGesamt),
    ampel: personal.daten.ampel,
    personal: personalKennzahl(personal),
  };
}
