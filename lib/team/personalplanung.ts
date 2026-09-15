import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  getStaffingRules,
  buildPersonalplanung,
  type Personalplanung,
} from "@/lib/team/anstellungsschluessel";
import {
  getBWPersonalschluesselTabelle,
  buildBWPersonalplanung,
  type BWGruppe,
  type BWPersonalplanung,
} from "@/lib/team/personalschluessel-bw";
import {
  getNRWPersonalstundenTabelle,
  buildNRWPersonalplanung,
  type NRWGruppe,
  type NRWPersonalplanung,
} from "@/lib/team/personalschluessel-nrw";

export type PersonalplanungErgebnis =
  | { modell: "bayern"; daten: Personalplanung }
  | { modell: "bw"; daten: BWPersonalplanung }
  | { modell: "nrw"; daten: NRWPersonalplanung };

/**
 * Ermittelt die Bundesland-passende Personalplanung für eine Einrichtung an
 * einem Stichtag (Bayern) bzw. für einen Monat (BW/NRW, monatsbasiert wie
 * Bayerns team_presence_for_month). Bayern, Baden-Württemberg und NRW
 * rechnen strukturell unterschiedlich (siehe die jeweiligen lib/team/
 * personalschluessel-*.ts-Module) — diese Funktion kapselt nur die
 * Bundesland-Auswahl, nicht die Formeln selbst.
 */
export async function getPersonalplanungFuerEinrichtung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtagOderMonat: string
): Promise<PersonalplanungErgebnis> {
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select(
      "bundesland_code, vollzeit_wochenstunden, empfohlener_anstellungsschluessel"
    )
    .eq("id", einrichtungId)
    .single();

  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;

  const teamRows = await getTeamPresenceForMonth(
    supabase,
    einrichtungId,
    stichtagOderMonat
  );
  const istFk = teamRows
    .filter((r) => r.role_category === "fk")
    .reduce((sum, r) => sum + (r.wochenstunden ?? 0), 0);
  const istEk = teamRows
    .filter((r) => r.role_category === "ek")
    .reduce((sum, r) => sum + (r.wochenstunden ?? 0), 0);

  if (bundeslandCode === "bw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden")
        .eq("einrichtung_id", einrichtungId)
        .is("archived_at", null),
      getBWPersonalschluesselTabelle(supabase),
    ]);
    const gruppen: BWGruppe[] = (gruppenRows ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      bwBetriebsform: g.bw_betriebsform,
      bwAltersmischung: g.bw_altersmischung,
      bwOeffnungszeitStunden: g.bw_oeffnungszeit_stunden,
    }));
    const daten = buildBWPersonalplanung(
      gruppen,
      tabelle,
      istFk + istEk,
      vollzeitWochenstunden
    );
    return { modell: "bw", daten };
  }

  if (bundeslandCode === "nrw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name, nrw_gruppenform, nrw_buchungszeit_stunden")
        .eq("einrichtung_id", einrichtungId)
        .is("archived_at", null),
      getNRWPersonalstundenTabelle(supabase),
    ]);
    const gruppen: NRWGruppe[] = (gruppenRows ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      nrwGruppenform: g.nrw_gruppenform,
      nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden,
    }));
    const daten = buildNRWPersonalplanung(gruppen, tabelle, istFk, istEk);
    return { modell: "nrw", daten };
  }

  // Bayern (Standard)
  const [kinderRows, staffingRules] = await Promise.all([
    getKinderPresenceAtDate(supabase, einrichtungId, stichtagOderMonat),
    getStaffingRules(supabase, bundeslandCode),
  ]);
  const { gewichteteKinderzahl, gewichteteKinderzahlFachkraftquote } =
    buildKpis(kinderRows);
  const daten = buildPersonalplanung(
    teamRows,
    gewichteteKinderzahl,
    gewichteteKinderzahlFachkraftquote,
    vollzeitWochenstunden,
    einrichtung?.empfohlener_anstellungsschluessel ?? 10.0,
    staffingRules
  );
  return { modell: "bayern", daten };
}
