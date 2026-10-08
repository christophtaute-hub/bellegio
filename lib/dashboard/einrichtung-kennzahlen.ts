import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth, type Ampel } from "@/lib/team/anstellungsschluessel";
import { ladePersonalplanungKontext, berechnePersonalplanung } from "@/lib/team/personalplanung";
import { personalKennzahl, type PersonalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import { ladeFinanzenBasis, resolveFinanzenMonat } from "@/lib/forecast/monthly-forecast";

export type EinrichtungKennzahlen = {
  kinderGesamt: number;
  sollplaetze: number;
  freiePlaetze: number;
  ampel: Ampel;
  personal: PersonalKennzahl;
  /** Förderung (+ Elternbeiträge) minus Personalkosten im Monat des Stichtags — nur, wenn die Finanzübersicht angefordert wurde. */
  ergebnisMonat: number | null;
};

/** Kennzahlen für die Mini-Dashboard-Kachel einer Einrichtung. Lädt die Kinder-Presence nur einmal und gibt sie
 * sowohl an die Belegung als auch an die Personalberechnung weiter (getPersonalplanungFuerEinrichtung würde sie für
 * Bayern ein zweites Mal laden). */
export async function ladeEinrichtungKennzahlen(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string,
  optionen: { zeigeFinanzen?: boolean } = {}
): Promise<EinrichtungKennzahlen> {
  const [{ data: gruppen }, kontext, kinderRows, teamRows] = await Promise.all([
    supabase.from("gruppen").select("id, sollplatze, nrw_gruppenform, nrw_buchungszeit_stunden").eq("einrichtung_id", einrichtungId).is("archived_at", null),
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
  // Dieselbe Berechnung wie im Controlling — nur für einen Monat; nur aufrufen, wenn der Nutzer die Finanzübersicht sehen darf.
  let ergebnisMonat: number | null = null;
  if (optionen.zeigeFinanzen) {
    const bundesland = personal.modell === "bayern" ? "by" : personal.modell;
    const nrwGruppenById = new Map((gruppen ?? []).map((g) => [g.id, { nrwGruppenform: g.nrw_gruppenform, nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden }]));
    const basis = await ladeFinanzenBasis(supabase, einrichtungId, bundesland, kontext.vollzeitWochenstunden, nrwGruppenById);
    ergebnisMonat = resolveFinanzenMonat(basis, stichtag, kinderRows, teamRows).ergebnisMonat;
  }
  return {
    ergebnisMonat,
    kinderGesamt: kpis.kinderGesamt,
    sollplaetze,
    freiePlaetze: Math.max(0, sollplaetze - kpis.kinderGesamt),
    ampel: personal.daten.ampel,
    personal: personalKennzahl(personal),
  };
}
