import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";

/** Bayern, Art. 21 Abs. 5 BayKiBiG: der Basisfaktor ergibt sich aus Alter und Gruppe — er wird nicht von Hand gepflegt.
 * Gegenstück zur SQL-Funktion kind_gewichtung_am_stichtag (Migration 20261006100000), die die Förderberechnung speist.
 * Dieses Modul dient der Anzeige (Formular, Listen) und den Tests der Grenzfälle. */
export const BASIS_CODES = ["u3", "ue3_bis_schuleintritt"] as const;
export type BasisCode = (typeof BASIS_CODES)[number];

export const BASIS_FAKTOR: Record<BasisCode, { label: string; factor: number }> = {
  u3: { label: "Kinder unter drei Jahren", factor: 2 },
  ue3_bis_schuleintritt: { label: "Kinder von drei Jahren bis Schuleintritt", factor: 1 },
};

export function istBasisCode(code: string | null | undefined): boolean {
  return BASIS_CODES.includes(code as BasisCode);
}

/** Letzter Tag des Kindergartenjahres, in dem `datum` liegt (Beginn im Monat `kitajahrBeginnMonat`). */
export function kindergartenjahrEnde(datum: string, kitajahrBeginnMonat: number): string {
  const d = parseIsoDate(datum);
  const startJahr = d.getUTCMonth() + 1 >= kitajahrBeginnMonat ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return toIsoDateString(new Date(Date.UTC(startJahr + 1, kitajahrBeginnMonat - 1, 1) - 24 * 3600 * 1000));
}

/** 2,0 für Kinder unter drei Jahren — und, wenn das Kind in einer Kinderkrippe drei wird, bis zum Ende des Kindergartenjahres;
 * danach 1,0 bis zum Schuleintritt. `gruppenartBeiDrittemGeburtstag`: Gruppenart an diesem Tag (oder die aktuelle als Näherung). */
export function leiteBasisfaktorAb(eingabe: {
  geburtsdatum: string;
  stichtag: string;
  gruppenartBeiDrittemGeburtstag: string | null;
  kitajahrBeginnMonat?: number;
}): BasisCode {
  const dritter = toIsoDateString(addMonthsUtc(parseIsoDate(eingabe.geburtsdatum), 36));
  if (eingabe.stichtag < dritter) return "u3";
  if (eingabe.gruppenartBeiDrittemGeburtstag === "krippe" && eingabe.stichtag <= kindergartenjahrEnde(dritter, eingabe.kitajahrBeginnMonat ?? 9)) return "u3";
  return "ue3_bis_schuleintritt";
}

export type ManuellerFaktor = { code: string; label: string; factor: number };

/** Der höchste Faktor aus abgeleitetem Basisfaktor und manuell gesetzten Sondermerkmalen (Basiszeilen in `manuell` zählen nicht). */
export function hoechsterFaktor(basis: BasisCode | null, manuell: ManuellerFaktor[]): { code: string; label: string; factor: number } | null {
  const kandidaten: { code: string; label: string; factor: number }[] = manuell.filter((m) => !(basis && istBasisCode(m.code)));
  if (basis) kandidaten.push({ code: basis, ...BASIS_FAKTOR[basis] });
  return kandidaten.sort((a, b) => b.factor - a.factor)[0] ?? null;
}
