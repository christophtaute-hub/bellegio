import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";

export type TeamPresenceRow = {
  team_id: string;
  vorname: string | null;
  nachname: string | null;
  rolle: string | null;
  role_category: string | null;
  wochenstunden: number | null;
};

export async function getStaffingRules(
  supabase: SupabaseClient<Database>,
  bundeslandCode: string
): Promise<StaffingRules> {
  const { data } = await supabase
    .from("staffing_rules")
    .select("mindestschluessel, fachkraftquote_anteil")
    .eq("bundesland_code", bundeslandCode)
    .single();

  return {
    mindestschluessel: data?.mindestschluessel ?? BAYERN_MINDESTSCHLUESSEL,
    fachkraftquoteAnteil: data?.fachkraftquote_anteil ?? BAYERN_FACHKRAFTQUOTE_ANTEIL,
  };
}

export type StaffingRulesVersion = StaffingRules & Versioniert;

/** Lädt alle je erfassten Fassungen (aktuelle Zeile + Historie) — Milestone 29b, zentrales
 * versioniertes Bundesland-Regelwerk. Wird stichtagsunabhängig einmal geladen, die Auflösung "welche
 * Fassung galt am Stichtag X" passiert danach rein in resolveStaffingRulesAmStichtag. */
export async function getStaffingRulesVersionen(
  supabase: SupabaseClient<Database>,
  bundeslandCode: string
): Promise<StaffingRulesVersion[]> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase
      .from("staffing_rules")
      .select("mindestschluessel, fachkraftquote_anteil, gueltig_ab")
      .eq("bundesland_code", bundeslandCode)
      .maybeSingle(),
    supabase
      .from("staffing_rules_historie")
      .select("mindestschluessel, fachkraftquote_anteil, gueltig_ab, gueltig_bis")
      .eq("quelle_bundesland_code", bundeslandCode),
  ]);

  const versionen: StaffingRulesVersion[] = (historie ?? []).map((h) => ({
    mindestschluessel: h.mindestschluessel,
    fachkraftquoteAnteil: h.fachkraftquote_anteil,
    gueltigAb: h.gueltig_ab,
    gueltigBis: h.gueltig_bis,
  }));
  if (live) {
    versionen.push({
      mindestschluessel: live.mindestschluessel,
      fachkraftquoteAnteil: live.fachkraftquote_anteil,
      gueltigAb: live.gueltig_ab,
      gueltigBis: null,
    });
  }
  return versionen;
}

/** Reine Funktion: löst die zum Stichtag gültige Fassung auf. Fällt bei einer Lücke (z.B. Stichtag
 * vor der ersten erfassten Fassung) auf die älteste bekannte Fassung zurück statt auf null — ein
 * gesetzlicher Mindestschlüssel gilt faktisch immer, ein leeres Ergebnis würde in der Ampel-Berechnung
 * als fälschliches "erfüllt" gelesen. Ganz ohne jede Version (z.B. BW/NRW ohne staffing_rules-Zeile)
 * bleibt der bisherige Bayern-Fallback bestehen. */
export function resolveStaffingRulesAmStichtag(versionen: StaffingRulesVersion[], stichtag: string): StaffingRules {
  const treffer = versionAmStichtagMitFallback(versionen, stichtag);
  return treffer
    ? { mindestschluessel: treffer.mindestschluessel, fachkraftquoteAnteil: treffer.fachkraftquoteAnteil }
    : { mindestschluessel: BAYERN_MINDESTSCHLUESSEL, fachkraftquoteAnteil: BAYERN_FACHKRAFTQUOTE_ANTEIL };
}

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

export const BAYERN_MINDESTSCHLUESSEL = 11.0;
export const BAYERN_FACHKRAFTQUOTE_ANTEIL = 0.5;

export type Ampel = "gruen" | "gelb" | "rot";

export type StaffingRules = {
  mindestschluessel: number;
  fachkraftquoteAnteil: number;
};

/**
 * § 17 AVBayKiBiG: "für je 11,0 [gewichtete Kinder] jeweils mindestens eine
 * [Vollzeitstelle] des pädagogischen Personals" (Anstellungsschlüssel 1:11,0).
 * Der Buchungszeitfaktor aus §24 AVBayKiBiG dient ausschließlich der
 * kindbezogenen Förderberechnung (Art. 21 BayKiBiG) und hat KEINEN Einfluss
 * auf Anstellungsschlüssel oder Fachkraftquote — bestätigt durch zwei
 * unabhängige Fachquellen (Institut für Kindergartenmanagement,
 * kitazentrale.de) und durch Plausibilitätsprüfung mit echten Einrichtungs-
 * daten (die wörtliche Buchungszeitfaktor-Variante ergab einen absurden
 * Schlüssel von 1:0,5). Personal wird in VZÄ (Vollzeitäquivalente) gemessen,
 * nicht in rohen Wochenstunden — ein VZÄ entspricht `vollzeitWochenstunden`
 * (Träger-spezifisch, Standard 39).
 *
 * Fachkraftquote (§17 Abs. 2): mind. 50% der SOLL-VZÄ müssen von Fachkräften
 * geleistet werden; der Integrationskinder-Gewichtungsfaktor (4,5) wird dafür
 * NICHT angesetzt (daher die separate gewichteteKinderzahlFachkraftquote).
 *
 * Hinweis: diese Formel stützt sich mangels eines auffindbaren amtlichen
 * Rechenbeispiels auf Fachquellen statt auf den reinen Gesetzeswortlaut —
 * siehe Dokumentationsseite für Details und die Empfehlung, den Wert mit dem
 * zuständigen Jugendamt abzugleichen.
 */
export type Personalplanung = {
  gewichteteKinderzahl: number;
  vzaeSoll: number;
  vzaeSollFachkraft: number;
  istFk: number;
  istEk: number;
  istAzGesamt: number;
  vzaeIst: number;
  vollzeitWochenstunden: number;
  anstellungsschluessel: number | null;
  mindestschluesselOk: boolean;
  empfohlenerSchluesselOk: boolean;
  empfohlenerSchluesselWert: number;
  qualifikationsschluesselOk: boolean;
  ampel: Ampel;
};

export function buildPersonalplanung(
  teamRows: TeamPresenceRow[],
  gewichteteKinderzahl: number,
  gewichteteKinderzahlFachkraftquote: number,
  vollzeitWochenstunden: number,
  empfohlenerSchluesselWert: number = 10.0,
  rules: StaffingRules = {
    mindestschluessel: BAYERN_MINDESTSCHLUESSEL,
    fachkraftquoteAnteil: BAYERN_FACHKRAFTQUOTE_ANTEIL,
  }
): Personalplanung {
  const { mindestschluessel: MINDESTSCHLUESSEL, fachkraftquoteAnteil: FACHKRAFTQUOTE_ANTEIL } =
    rules;
  const vzaeSoll = gewichteteKinderzahl / MINDESTSCHLUESSEL;
  const vzaeSollFachkraft =
    FACHKRAFTQUOTE_ANTEIL *
    (gewichteteKinderzahlFachkraftquote / MINDESTSCHLUESSEL);

  const istFk = teamRows
    .filter((row) => row.role_category === "fk")
    .reduce((sum, row) => sum + (row.wochenstunden ?? 0), 0);
  const istEk = teamRows
    .filter((row) => row.role_category === "ek")
    .reduce((sum, row) => sum + (row.wochenstunden ?? 0), 0);
  const istAzGesamt = istFk + istEk;

  const vzaeIst = vollzeitWochenstunden > 0 ? istAzGesamt / vollzeitWochenstunden : 0;
  const istFkVzae = vollzeitWochenstunden > 0 ? istFk / vollzeitWochenstunden : 0;

  const anstellungsschluessel =
    vzaeIst > 0
      ? Math.round((gewichteteKinderzahl / vzaeIst) * 100) / 100
      : null;

  const mindestschluesselOk =
    anstellungsschluessel !== null && anstellungsschluessel <= MINDESTSCHLUESSEL;
  const empfohlenerSchluesselOk =
    anstellungsschluessel !== null &&
    anstellungsschluessel <= empfohlenerSchluesselWert;
  const qualifikationsschluesselOk = istFkVzae >= vzaeSollFachkraft;

  let ampel: Ampel;
  if (gewichteteKinderzahl === 0) {
    ampel = "gruen";
  } else if (mindestschluesselOk && qualifikationsschluesselOk) {
    ampel = "gruen";
  } else if (mindestschluesselOk) {
    ampel = "gelb";
  } else {
    ampel = "rot";
  }

  return {
    gewichteteKinderzahl,
    vzaeSoll,
    vzaeSollFachkraft,
    istFk,
    istEk,
    istAzGesamt,
    vzaeIst,
    vollzeitWochenstunden,
    anstellungsschluessel,
    mindestschluesselOk,
    empfohlenerSchluesselOk,
    empfohlenerSchluesselWert,
    qualifikationsschluesselOk,
    ampel,
  };
}
