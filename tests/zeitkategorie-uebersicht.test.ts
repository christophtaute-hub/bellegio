import { describe, expect, it } from "vitest";
import { buildZeitkategorieUebersicht, type ZeitkategorieMonatEintrag } from "@/lib/forecast/zeitkategorie-uebersicht";
import type { CompositionMatrix } from "@/lib/dashboard/presence";

function matrix(rows: { label: string; faktor: number; total: number }[]): CompositionMatrix {
  return {
    buchungszeitLabels: ["6-7h"],
    rows: rows.map((r) => ({ weightingLabel: r.label, weightingFactor: r.faktor, cells: { "6-7h": r.total }, total: r.total })),
    columnTotals: { "6-7h": rows.reduce((s, r) => s + r.total, 0) },
    grandTotal: rows.reduce((s, r) => s + r.total, 0),
  };
}

describe("12-Monats-Übersicht der Zeitkategorie", () => {
  it("eine Zeile je Gewichtungsfaktor, Monate als Spalten, fehlende Monate zählen als 0", () => {
    const monate: ZeitkategorieMonatEintrag[] = [
      { month: "2026-01-01", matrix: matrix([{ label: "U3 (2,0)", faktor: 2, total: 4 }, { label: "Ü3 (1,2)", faktor: 1.2, total: 6 }]) },
      { month: "2026-02-01", matrix: matrix([{ label: "Ü3 (1,2)", faktor: 1.2, total: 7 }]) },
    ];
    const uebersicht = buildZeitkategorieUebersicht(monate);
    expect(uebersicht.zeilen.map((z) => z.weightingLabel)).toEqual(["Ü3 (1,2)", "U3 (2,0)"]);
    expect(uebersicht.zeilen.find((z) => z.weightingLabel === "U3 (2,0)")?.kinderProMonat).toEqual([4, 0]);
    expect(uebersicht.zeilen.find((z) => z.weightingLabel === "Ü3 (1,2)")?.kinderProMonat).toEqual([6, 7]);
    expect(uebersicht.summeProMonat).toEqual([10, 7]);
  });

  it("sortiert Zeilen nach Gewichtungsfaktor, nicht alphabetisch", () => {
    const monate: ZeitkategorieMonatEintrag[] = [
      { month: "2026-01-01", matrix: matrix([{ label: "Integration (4,5)", faktor: 4.5, total: 1 }, { label: "U3 (2,0)", faktor: 2, total: 2 }]) },
    ];
    expect(buildZeitkategorieUebersicht(monate).zeilen.map((z) => z.weightingLabel)).toEqual(["U3 (2,0)", "Integration (4,5)"]);
  });

  it("ohne Monate gibt es eine leere Übersicht", () => {
    expect(buildZeitkategorieUebersicht([])).toEqual({ zeilen: [], summeProMonat: [] });
  });
});
