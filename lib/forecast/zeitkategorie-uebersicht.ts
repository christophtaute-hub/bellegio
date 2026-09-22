import type { CompositionMatrix } from "@/lib/dashboard/presence";

export type ZeitkategorieMonatEintrag = { month: string; matrix: CompositionMatrix };

export type ZeitkategorieUebersichtZeile = {
  weightingLabel: string;
  weightingFactor: number;
  /** Gleiche Reihenfolge wie die übergebenen Monate. */
  kinderProMonat: number[];
};

export type ZeitkategorieUebersicht = {
  zeilen: ZeitkategorieUebersichtZeile[];
  summeProMonat: number[];
};

/** Fasst mehrere Monats-Matrizen (Gewichtungsfaktor × Buchungszeit) zu einer Übersicht mit Monaten als Spalten
 * zusammen — eine Zeile je Gewichtungsfaktor-Kategorie, die in mindestens einem Monat vorkommt, nach
 * Gewichtungsfaktor sortiert wie in der Detailmatrix. Für die Buchungszeit-Aufschlüsselung eines einzelnen
 * Monats bleibt dessen volle `CompositionMatrix` unverändert verfügbar (Detailansicht). */
export function buildZeitkategorieUebersicht(monate: ZeitkategorieMonatEintrag[]): ZeitkategorieUebersicht {
  const faktorByLabel = new Map<string, number>();
  for (const { matrix } of monate) {
    for (const row of matrix.rows) {
      if (!faktorByLabel.has(row.weightingLabel)) faktorByLabel.set(row.weightingLabel, row.weightingFactor);
    }
  }
  const labels = Array.from(faktorByLabel.entries()).sort((a, b) => a[1] - b[1]);

  const zeilen = labels.map(([weightingLabel, weightingFactor]) => ({
    weightingLabel,
    weightingFactor,
    kinderProMonat: monate.map(({ matrix }) => matrix.rows.find((r) => r.weightingLabel === weightingLabel)?.total ?? 0),
  }));
  const summeProMonat = monate.map(({ matrix }) => matrix.grandTotal);

  return { zeilen, summeProMonat };
}
