import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  getStaffingRulesVersionen,
  resolveStaffingRulesAmStichtag,
  buildPersonalplanung,
  type Personalplanung,
  type StaffingRules,
  type StaffingRulesVersion,
  type TeamPresenceRow,
} from "@/lib/team/anstellungsschluessel";
import {
  getBWPersonalschluesselVersionen,
  resolveBWPersonalschluesselTabelleAmStichtag,
  buildBWPersonalplanung,
  type BWGruppe,
  type BWPersonalplanung,
  type BWPersonalschluesselRow,
  type BWPersonalschluesselVersion,
} from "@/lib/team/personalschluessel-bw";
import {
  getNRWPersonalstundenVersionen,
  resolveNRWPersonalstundenTabelleAmStichtag,
  buildNRWPersonalplanung,
  type NRWGruppe,
  type NRWPersonalplanung,
  type NRWPersonalstundenRow,
  type NRWPersonalstundenVersion,
} from "@/lib/team/personalschluessel-nrw";

export type PersonalplanungErgebnis =
  | { modell: "bayern"; daten: Personalplanung }
  | { modell: "bw"; daten: BWPersonalplanung }
  | { modell: "nrw"; daten: NRWPersonalplanung };

/** Alles, was für die Personalplanung einer Einrichtung monatsunabhängig ist
 * (Gesetzestabellen, Gruppen-Konfiguration) — einmal geladen und für viele
 * Monate wiederverwendbar (z.B. im Forecast). */
export type PersonalplanungKontext =
  | {
      modell: "bayern";
      vollzeitWochenstunden: number;
      empfohlenerSchluessel: number;
      staffingRules: StaffingRules;
    }
  | {
      modell: "bw";
      vollzeitWochenstunden: number;
      gruppen: BWGruppe[];
      tabelle: BWPersonalschluesselRow[];
    }
  | {
      modell: "nrw";
      vollzeitWochenstunden: number;
      gruppen: NRWGruppe[];
      tabelle: NRWPersonalstundenRow[];
    };

/** Wie PersonalplanungKontext, aber noch nicht auf einen Stichtag aufgelöst — enthält die vollen
 * Gesetzestabellen-Historien (Milestone 29b, zentrales versioniertes Bundesland-Regelwerk) statt
 * einer einzelnen Fassung. Ein DB-Zugriff, danach beliebig oft über resolvePersonalplanungKontext
 * für verschiedene Stichtage (z.B. je Forecast-Monat) auflösbar, ohne erneut zu laden. */
export type PersonalplanungBasis =
  | {
      modell: "bayern";
      vollzeitWochenstunden: number;
      empfohlenerSchluessel: number;
      staffingRulesVersionen: StaffingRulesVersion[];
    }
  | {
      modell: "bw";
      vollzeitWochenstunden: number;
      gruppen: BWGruppe[];
      versionenByGroup: Map<string, BWPersonalschluesselVersion[]>;
    }
  | {
      modell: "nrw";
      vollzeitWochenstunden: number;
      gruppen: NRWGruppe[];
      versionenByGroup: Map<string, NRWPersonalstundenVersion[]>;
    };

export type KinderKennzahlenFuerPersonal = {
  gewichteteKinderzahl: number;
  gewichteteKinderzahlFachkraftquote: number;
};

export async function ladePersonalplanungBasis(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<PersonalplanungBasis> {
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code, vollzeit_wochenstunden, empfohlener_anstellungsschluessel")
    .eq("id", einrichtungId)
    .single();

  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;

  if (bundeslandCode === "bw") {
    const [{ data: gruppenRows }, versionenByGroup] = await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden, bw_randzeit_stunden")
        .eq("einrichtung_id", einrichtungId)
        .is("archived_at", null),
      getBWPersonalschluesselVersionen(supabase),
    ]);
    return {
      modell: "bw",
      vollzeitWochenstunden,
      versionenByGroup,
      gruppen: (gruppenRows ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        bwBetriebsform: g.bw_betriebsform,
        bwAltersmischung: g.bw_altersmischung,
        bwOeffnungszeitStunden: g.bw_oeffnungszeit_stunden,
        bwRandzeitStunden: g.bw_randzeit_stunden,
      })),
    };
  }

  if (bundeslandCode === "nrw") {
    const [{ data: gruppenRows }, versionenByGroup] = await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name, nrw_gruppenform, nrw_buchungszeit_stunden")
        .eq("einrichtung_id", einrichtungId)
        .is("archived_at", null),
      getNRWPersonalstundenVersionen(supabase),
    ]);
    return {
      modell: "nrw",
      vollzeitWochenstunden,
      versionenByGroup,
      gruppen: (gruppenRows ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        nrwGruppenform: g.nrw_gruppenform,
        nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden,
      })),
    };
  }

  return {
    modell: "bayern",
    vollzeitWochenstunden,
    empfohlenerSchluessel: einrichtung?.empfohlener_anstellungsschluessel ?? 10.0,
    staffingRulesVersionen: await getStaffingRulesVersionen(supabase, bundeslandCode),
  };
}

/** Reine Funktion: löst die noch stichtags-freie Basis für einen konkreten Stichtag auf (welche
 * Gesetzesfassung galt an diesem Tag) — Milestone 29b. Kein DB-Zugriff, darum beliebig oft pro
 * geladener Basis aufrufbar (z.B. einmal je Forecast-Monat), ohne erneut zu laden. */
export function resolvePersonalplanungKontext(basis: PersonalplanungBasis, stichtag: string): PersonalplanungKontext {
  if (basis.modell === "bw") {
    return {
      modell: "bw",
      vollzeitWochenstunden: basis.vollzeitWochenstunden,
      gruppen: basis.gruppen,
      tabelle: resolveBWPersonalschluesselTabelleAmStichtag(basis.versionenByGroup, stichtag),
    };
  }
  if (basis.modell === "nrw") {
    return {
      modell: "nrw",
      vollzeitWochenstunden: basis.vollzeitWochenstunden,
      gruppen: basis.gruppen,
      tabelle: resolveNRWPersonalstundenTabelleAmStichtag(basis.versionenByGroup, stichtag),
    };
  }
  return {
    modell: "bayern",
    vollzeitWochenstunden: basis.vollzeitWochenstunden,
    empfohlenerSchluessel: basis.empfohlenerSchluessel,
    staffingRules: resolveStaffingRulesAmStichtag(basis.staffingRulesVersionen, stichtag),
  };
}

/** Dünner Komfort-Wrapper für Aufrufer mit nur einem Stichtag (z.B. getPersonalplanungFuerEinrichtung).
 * Für mehrere Stichtage (Forecast über mehrere Monate) stattdessen ladePersonalplanungBasis einmal
 * laden und resolvePersonalplanungKontext je Monat aufrufen — spart wiederholte DB-Zugriffe. */
export async function ladePersonalplanungKontext(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string
): Promise<PersonalplanungKontext> {
  return resolvePersonalplanungKontext(await ladePersonalplanungBasis(supabase, einrichtungId), stichtag);
}

/** Reine Funktion: wendet die Bundesland-passende Formel auf die bereits
 * geladenen Team-/Kinderdaten eines Monats an. */
export function berechnePersonalplanung(
  kontext: PersonalplanungKontext,
  teamRows: TeamPresenceRow[],
  kinder: KinderKennzahlenFuerPersonal
): PersonalplanungErgebnis {
  const istFk = teamRows
    .filter((r) => r.role_category === "fk")
    .reduce((sum, r) => sum + (r.wochenstunden ?? 0), 0);
  const istEk = teamRows
    .filter((r) => r.role_category === "ek")
    .reduce((sum, r) => sum + (r.wochenstunden ?? 0), 0);

  if (kontext.modell === "bw") {
    return {
      modell: "bw",
      daten: buildBWPersonalplanung(
        kontext.gruppen,
        kontext.tabelle,
        istFk + istEk,
        kontext.vollzeitWochenstunden
      ),
    };
  }
  if (kontext.modell === "nrw") {
    return {
      modell: "nrw",
      daten: buildNRWPersonalplanung(kontext.gruppen, kontext.tabelle, istFk, istEk),
    };
  }
  return {
    modell: "bayern",
    daten: buildPersonalplanung(
      teamRows,
      kinder.gewichteteKinderzahl,
      kinder.gewichteteKinderzahlFachkraftquote,
      kontext.vollzeitWochenstunden,
      kontext.empfohlenerSchluessel,
      kontext.staffingRules
    ),
  };
}

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
  const kontext = await ladePersonalplanungKontext(supabase, einrichtungId, stichtagOderMonat);
  const [teamRows, kinderRows] = await Promise.all([
    getTeamPresenceForMonth(supabase, einrichtungId, stichtagOderMonat),
    kontext.modell === "bayern"
      ? getKinderPresenceAtDate(supabase, einrichtungId, stichtagOderMonat)
      : Promise.resolve([]),
  ]);
  const { gewichteteKinderzahl, gewichteteKinderzahlFachkraftquote } = buildKpis(kinderRows);
  return berechnePersonalplanung(kontext, teamRows, {
    gewichteteKinderzahl,
    gewichteteKinderzahlFachkraftquote,
  });
}
