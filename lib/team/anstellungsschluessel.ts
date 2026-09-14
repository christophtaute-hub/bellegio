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
const FACHKRAFTQUOTE_ANTEIL = 0.5;

export type Ampel = "gruen" | "gelb" | "rot";

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
  empfohlenerSchluesselWert: number = 10.0
): Personalplanung {
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
