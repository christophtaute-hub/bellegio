/** Das Ergebnis ist bewusst nur Einnahmen (Förderung, ggf. Elternbeiträge laut eigener Preisliste) minus Personalkosten. Kommunale
 * Zuschüsse und Sachkosten fehlen — ohne diesen Hinweis wirkt ein negatives Ergebnis wie ein echtes Defizit. */
export function ergebnisHinweis(mitElternbeitraegen: boolean): string {
  return mitElternbeitraegen
    ? "Ergebnis = Fördererlöse + Elternbeiträge (laut eurer Preisliste) − Personalkosten. Kommunaler Anteil und Sachkosten sind nicht enthalten — ein negativer Wert ist daher nicht automatisch ein Defizit."
    : "Ergebnis = Fördererlöse − Personalkosten. Elternbeiträge, kommunaler Anteil und Sachkosten sind nicht enthalten (Elternbeiträge lassen sich unter Einstellungen → Finanzen als Preisliste hinterlegen) — ein negativer Wert ist daher kein Defizit der Einrichtung.";
}

/** Bisheriger Text ohne Elternbeiträge. */
export const ERGEBNIS_HINWEIS = ergebnisHinweis(false);
