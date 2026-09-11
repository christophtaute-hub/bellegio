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

export function buildCompositionMatrix(rows: PresenceRow[]): CompositionMatrix {
  const buchungszeitOrder = new Map<string, number>();
  for (const row of rows) {
    const label = row.buchungszeit_label ?? OHNE_BUCHUNGSZEIT;
    const factor = row.buchungszeit_factor ?? Number.POSITIVE_INFINITY;
    if (!buchungszeitOrder.has(label)) {
      buchungszeitOrder.set(label, factor);
    }
  }
  const buchungszeitLabels = Array.from(buchungszeitOrder.entries())
    .sort((a, b) => a[1] - b[1])
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
  durchschnittGewichtungsfaktor: number;
  ohneBuchungszeit: number;
};

export function buildKpis(rows: PresenceRow[]): KpiSummary {
  const kinderGesamt = rows.length;
  let gewichteteSumme = 0;
  let ohneBuchungszeit = 0;
  let weightingSum = 0;

  for (const row of rows) {
    const buchungszeitFactor = row.buchungszeit_factor ?? 0;
    gewichteteSumme += buchungszeitFactor * row.weighting_factor_value;
    weightingSum += row.weighting_factor_value;
    if (row.buchungszeit_band_id === null) {
      ohneBuchungszeit += 1;
    }
  }

  return {
    kinderGesamt,
    gewichteteSumme,
    durchschnittGewichtungsfaktor:
      kinderGesamt > 0 ? weightingSum / kinderGesamt : 0,
    ohneBuchungszeit,
  };
}
