/** Das Ergebnis ist bewusst nur Einnahmen (Förderung inkl. kommunalem Anteil in Bayern, ggf. Elternbeiträge laut eigener Preisliste)
 * minus Personalkosten und eingetragene sonstige Kosten. Verpflegung, Pflegemittel und Zusatzstunden fehlen — ohne diesen Hinweis
 * wirkt ein negatives Ergebnis wie ein echtes Defizit. */
export function ergebnisHinweis(mitElternbeitraegen: boolean): string {
  return mitElternbeitraegen
    ? "Ergebnis = Fördererlöse + Elternbeiträge (laut eurer Preisliste) − Personalkosten − eingetragene sonstige Kosten. Verpflegung, Pflegemittel und Zusatzstunden sind nicht enthalten — ein negativer Wert ist daher nicht automatisch ein Defizit."
    : "Ergebnis = Fördererlöse − Personalkosten − eingetragene sonstige Kosten. Elternbeiträge sind nicht enthalten (unter Einstellungen → Finanzen als Preisliste hinterlegen) — ein negativer Wert ist daher kein Defizit der Einrichtung.";
}

/** Bisheriger Text ohne Elternbeiträge. */
export const ERGEBNIS_HINWEIS = ergebnisHinweis(false);
