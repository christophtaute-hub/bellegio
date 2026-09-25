import { describe, expect, it } from "vitest";
import {
  berechneBayernFoerdererloesProKind,
  berechneBayernFoerdererloesGesamt,
  berechneNRWFoerdererloesProKindMonat,
  berechneNRWFoerdererloesGesamt,
  resolveNRWKindpauschalenTabelleAmStichtag,
  type BayernBasiswert,
  type NRWKindpauschaleRow,
  type NRWKindpauschaleVersion,
} from "@/lib/finanzen/foerdererloese";
import type { PresenceRow } from "@/lib/dashboard/presence";

function kind(partial: Partial<PresenceRow>): PresenceRow {
  return {
    kind_id: Math.random().toString(),
    gruppe_id: null,
    buchungszeit_band_id: "b",
    buchungszeit_label: "6-7h",
    buchungszeit_factor: 1.75,
    weighting_factor_id: null,
    weighting_factor_code: null,
    weighting_factor_label: null,
    weighting_factor_value: 1.0,
    weighting_factor_value_fachkraftquote: 1.0,
    ...partial,
  };
}

const basiswert: BayernBasiswert = { basiswert: 1000, qualitaetsbonus: 100 };

describe("berechneBayernFoerdererloesProKind", () => {
  it("Regelkind (Faktor 1,0) und U3-Kind (Faktor 2,0) bei gleicher Buchungszeit ergeben unterschiedliche Beträge", () => {
    const regelkind = kind({ weighting_factor_value: 1.0 });
    const u3Kind = kind({ weighting_factor_value: 2.0 });
    const ergebnisRegel = berechneBayernFoerdererloesProKind(regelkind, basiswert);
    const ergebnisU3 = berechneBayernFoerdererloesProKind(u3Kind, basiswert);
    expect(ergebnisRegel).toBeCloseTo(1.75 * 1.0 * 1000 + 100, 10);
    expect(ergebnisU3).toBeCloseTo(1.75 * 2.0 * 1000 + 100, 10);
    expect(ergebnisU3).toBeGreaterThan(ergebnisRegel);
  });

  it("ohne Buchungszeitfaktor (null) bleibt der Basisterm 0, der Qualitätsbonus bleibt trotzdem bestehen", () => {
    const ohneBuchungszeit = kind({ buchungszeit_factor: null });
    expect(berechneBayernFoerdererloesProKind(ohneBuchungszeit, basiswert)).toBe(100);
  });
});

describe("berechneBayernFoerdererloesGesamt", () => {
  it("summiert über mehrere Kinder", () => {
    const rows = [kind({ weighting_factor_value: 1.0 }), kind({ weighting_factor_value: 2.0 })];
    const summe = berechneBayernFoerdererloesGesamt(rows, basiswert);
    expect(summe).toBeCloseTo((1.75 * 1.0 * 1000 + 100) + (1.75 * 2.0 * 1000 + 100), 10);
  });

  it("ohne Basiswert (null) liefert 0", () => {
    expect(berechneBayernFoerdererloesGesamt([kind({})], null)).toBe(0);
  });
});

const nrwTabelle: NRWKindpauschaleRow[] = [
  { gruppenform: "I", buchungszeitStunden: 25, betragJahr: 8040.83 },
  { gruppenform: "I", buchungszeitStunden: 35, betragJahr: 10809.51 },
  { gruppenform: "I", buchungszeitStunden: 45, betragJahr: 13876.28 },
];

describe("berechneNRWFoerdererloesProKindMonat", () => {
  it("rechnet den Jahresbetrag korrekt auf einen Monatswert um (/12)", () => {
    const monat = berechneNRWFoerdererloesProKindMonat("I", 35, nrwTabelle);
    expect(monat).toBeCloseTo(10809.51 / 12, 10);
  });

  it("ein Kind ohne Gruppe (gruppenform null) liefert 0", () => {
    expect(berechneNRWFoerdererloesProKindMonat(null, 35, nrwTabelle)).toBe(0);
  });

  it("eine Gruppe mit gültiger Gruppenform aber unbekannter Buchungszeit liefert ebenfalls 0 (unterscheidbar vom null-Fall im Aufrufer)", () => {
    expect(berechneNRWFoerdererloesProKindMonat("I", 99, nrwTabelle)).toBe(0);
  });
});

describe("berechneNRWFoerdererloesGesamt", () => {
  it("summiert über mehrere Kinder anhand ihrer Gruppe", () => {
    const gruppenById = new Map([
      ["g1", { nrwGruppenform: "I", nrwBuchungszeitStunden: 25 }],
      ["g2", { nrwGruppenform: "I", nrwBuchungszeitStunden: 45 }],
    ]);
    const summe = berechneNRWFoerdererloesGesamt(["g1", "g2", null], gruppenById, nrwTabelle);
    expect(summe).toBeCloseTo(8040.83 / 12 + 13876.28 / 12, 10);
  });
});

describe("resolveNRWKindpauschalenTabelleAmStichtag (Milestone 29b-Wiederverwendung)", () => {
  it("ein Stichtag vor der gesäten Version löst trotzdem auf (Fallback auf älteste Fassung)", () => {
    const versionenByGroup = new Map<string, NRWKindpauschaleVersion[]>([
      ["I::25", [{ gruppenform: "I", buchungszeitStunden: 25, betragJahr: 8040.83, gueltigAb: "2025-08-01", gueltigBis: null }]],
    ]);
    const ergebnis = resolveNRWKindpauschalenTabelleAmStichtag(versionenByGroup, "2020-01-01");
    expect(ergebnis).toEqual([{ gruppenform: "I", buchungszeitStunden: 25, betragJahr: 8040.83 }]);
  });
});

