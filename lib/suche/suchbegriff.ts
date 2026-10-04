/** Zerlegt eine Sucheingabe in sichere Tokens für PostgREST-`ilike`-Filter. Erlaubt sind nur Buchstaben, Ziffern,
 * Bindestrich und Apostroph — alles andere (`% _ , ( ) . : * " \`) wird entfernt, damit die Eingabe weder Wildcards
 * noch Filter-Syntax einschleusen kann (`a,vorname.ilike.%` bliebe wirkungslos). Mehrere Wörter ("Anna Müller") werden
 * später per UND verknüpft, jedes Wort darf in Vor- oder Nachname vorkommen. */
export const MAX_TOKENS = 5;
export const MAX_TOKEN_LAENGE = 40;

export function suchTokens(eingabe: string): string[] {
  return eingabe
    .split(/\s+/)
    .map((wort) => wort.replace(/[^\p{L}\p{N}'-]/gu, "").slice(0, MAX_TOKEN_LAENGE))
    .filter((wort) => wort.length > 0)
    .slice(0, MAX_TOKENS);
}

/** Je Token ein `or`-Filter-String für PostgREST (nacheinander angewendet = UND über die Tokens, ODER über die Spalten). */
export function oderFilter(tokens: string[], spalten: string[]): string[] {
  return tokens.map((token) => spalten.map((spalte) => `${spalte}.ilike.%${token}%`).join(","));
}
