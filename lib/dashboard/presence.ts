import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type PresenceRow = {
  kind_id: string;
  gruppe_id: string | null;
  buchungszeit_band_id: string | null;
  buchungszeit_label: string | null;
  buchungszeit_factor: number | null;
  weighting_factor_id: string | null;
  weighting_factor_code: string | null;
  weighting_factor_label: string | null;
  weighting_factor_value: number;
  /** Wie weighting_factor_value, aber der Integrationskinder-Faktor (4,5)
   * wird nie angesetzt — Grundlage für die Fachkraftquote (§17 Abs. 2 Satz 2
   * AVBayKiBiG: der Gewichtungsfaktor für behinderte Kinder wird für die
   * Fachkraftquote nicht eingerechnet). */
  weighting_factor_value_fachkraftquote: number;
};

export async function getKinderPresenceAtDate(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string
): Promise<PresenceRow[]> {
  const { data, error } = await supabase.rpc("kinder_presence_at_date", {
    p_einrichtung_id: einrichtungId,
    p_stichtag: stichtag,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const OHNE_BUCHUNGSZEIT = "Ohne Buchungszeit";
const REGELFAKTOR_LABEL = "Regelfaktor (1,0)";

export type CompositionMatrix = {
  buchungszeitLabels: string[];
  rows: {
    weightingLabel: string;
    weightingFactor: number;
    cells: Record<string, number>;
    total: number;
  }[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

/** Sortierwert einer Buchungszeit-Bezeichnung: die erste Zahl darin („6-7h“ → 6, „35,5h-40h“ → 35,5,
 * „über 9h“ → 9). So stehen die Bänder in jedem Bundesland von niedrig nach hoch — der Förderfaktor
 * taugt dafür nicht, denn er ist nur in Bayern unterschiedlich (BW/NRW: überall 1,0). „Ohne Buchungszeit“
 * steht immer zuletzt. */
export function buchungszeitSortWert(label: string): number {
  if (label === OHNE_BUCHUNGSZEIT) return Number.POSITIVE_INFINITY;
  const treffer = /(\d+(?:[.,]\d+)?)/.exec(label);
  return treffer ? Number(treffer[1].replace(",", ".")) : Number.MAX_SAFE_INTEGER;
}

export function buildCompositionMatrix(rows: PresenceRow[]): CompositionMatrix {
  const buchungszeitFaktoren = new Map<string, number>();
  for (const row of rows) {
    const label = row.buchungszeit_label ?? OHNE_BUCHUNGSZEIT;
    if (!buchungszeitFaktoren.has(label)) {
      buchungszeitFaktoren.set(label, row.buchungszeit_factor ?? Number.POSITIVE_INFINITY);
    }
  }
  const buchungszeitLabels = Array.from(buchungszeitFaktoren.entries())
    .sort((a, b) => buchungszeitSortWert(a[0]) - buchungszeitSortWert(b[0]) || a[1] - b[1])
    .map(([label]) => label);

  const weightingRows = new Map<string, number>();
  for (const row of rows) {
    const label = row.weighting_factor_label ?? REGELFAKTOR_LABEL;
    if (!weightingRows.has(label)) {
      weightingRows.set(label, row.weighting_factor_value);
    }
  }
  const sortedWeightingLabels = Array.from(weightingRows.entries()).sort(
    (a, b) => a[1] - b[1]
  );

  const cellCounts = new Map<string, number>();
  for (const row of rows) {
    const weightingLabel = row.weighting_factor_label ?? REGELFAKTOR_LABEL;
    const buchungszeitLabel = row.buchungszeit_label ?? OHNE_BUCHUNGSZEIT;
    const key = `${weightingLabel}::${buchungszeitLabel}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }

  const rowsOut = sortedWeightingLabels.map(([weightingLabel, weightingFactor]) => {
    const cells: Record<string, number> = {};
    let total = 0;
    for (const bzLabel of buchungszeitLabels) {
      const count = cellCounts.get(`${weightingLabel}::${bzLabel}`) ?? 0;
      cells[bzLabel] = count;
      total += count;
    }
    return { weightingLabel, weightingFactor, cells, total };
  });

  const columnTotals: Record<string, number> = {};
  for (const bzLabel of buchungszeitLabels) {
    columnTotals[bzLabel] = rowsOut.reduce((sum, r) => sum + r.cells[bzLabel], 0);
  }
  const grandTotal = rowsOut.reduce((sum, r) => sum + r.total, 0);

  return { buchungszeitLabels, rows: rowsOut, columnTotals, grandTotal };
}

export type KpiSummary = {
  kinderGesamt: number;
  gewichteteSumme: number;
  /** Gewichtete Summe für die Fachkraftquote-Grundlage — Integrationskinder
   * zählen hier mit ihrem sonst zutreffenden Faktor, nicht mit 4,5. */
  gewichteteSummeFachkraftquote: number;
  /** Gewichtete Kinderzahl (nur Gewichtungsfaktor, ohne Buchungszeitfaktor) —
   * Grundlage für den Anstellungsschlüssel nach §17 AVBayKiBiG. Der
   * Buchungszeitfaktor aus §24 AVBayKiBiG dient ausschließlich der
   * kindbezogenen Förderberechnung und fließt in den Anstellungsschlüssel
   * nicht ein. */
  gewichteteKinderzahl: number;
  /** Wie gewichteteKinderzahl, aber ohne den Integrationskinder-Faktor (4,5)
   * — Grundlage für die Fachkraftquote (§17 Abs. 2 Satz 2 AVBayKiBiG). */
  gewichteteKinderzahlFachkraftquote: number;
  durchschnittGewichtungsfaktor: number;
  ohneBuchungszeit: number;
};

export function buildKpis(rows: PresenceRow[]): KpiSummary {
  const kinderGesamt = rows.length;
  let gewichteteSumme = 0;
  let gewichteteSummeFachkraftquote = 0;
  let gewichteteKinderzahl = 0;
  let gewichteteKinderzahlFachkraftquote = 0;
  let ohneBuchungszeit = 0;

  for (const row of rows) {
    const buchungszeitFactor = row.buchungszeit_factor ?? 0;
    gewichteteSumme += buchungszeitFactor * row.weighting_factor_value;
    gewichteteSummeFachkraftquote +=
      buchungszeitFactor * row.weighting_factor_value_fachkraftquote;
    gewichteteKinderzahl += row.weighting_factor_value;
    gewichteteKinderzahlFachkraftquote += row.weighting_factor_value_fachkraftquote;
    if (row.buchungszeit_band_id === null) {
      ohneBuchungszeit += 1;
    }
  }

  return {
    kinderGesamt,
    gewichteteSumme,
    gewichteteSummeFachkraftquote,
    gewichteteKinderzahl,
    gewichteteKinderzahlFachkraftquote,
    durchschnittGewichtungsfaktor:
      kinderGesamt > 0 ? gewichteteKinderzahl / kinderGesamt : 0,
    ohneBuchungszeit,
  };
}

export type BelegungKennzahlen = {
  belegteOhneI: number;
  belegteMitI: number;
  plaetzeNachBetriebserlaubnis: number;
  differenz: number;
};

export function buildBelegungKennzahlen(
  rows: PresenceRow[],
  gruppenSollplatzeSumme: number
): BelegungKennzahlen {
  const belegteMitI = rows.length;
  const belegteOhneI = rows.filter(
    (row) => row.weighting_factor_code !== "integrationskinder"
  ).length;

  return {
    belegteOhneI,
    belegteMitI,
    plaetzeNachBetriebserlaubnis: gruppenSollplatzeSumme,
    differenz: belegteMitI - gruppenSollplatzeSumme,
  };
}
