import { describe, expect, it } from "vitest";
import {
  berechneBayernFoerdererloesProKind,
  berechneBayernFoerdererloesGesamt,
  berechneBayernFoerderungProKind,
  berechneBayernFoerderungGesamt,
  istU3FuerFoerderung,
  berechneTeamkraeftepauschaleJahr,
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
    expect(ergebnisRegel).toBeCloseTo(1.75 * 1.0 * (1000 + 100), 10);
    expect(ergebnisU3).toBeCloseTo(1.75 * 2.0 * (1000 + 100), 10);
    expect(ergebnisU3).toBeGreaterThan(ergebnisRegel);
  });

  it("ohne Buchungszeitfaktor (null) gibt es keine Förderung — der Qualitätsbonus ist Teil des Basiswerts, kein Festbetrag", () => {
    const ohneBuchungszeit = kind({ buchungszeit_factor: null });
    expect(berechneBayernFoerdererloesProKind(ohneBuchungszeit, basiswert)).toBe(0);
  });

  it("Beispiel mit den amtlichen 2026-Werten: Kind 7-8h (Faktor 2,0), Regelkind ab 3 Jahren", () => {
    const amtlich: BayernBasiswert = { basiswert: 1563.88, qualitaetsbonus: 268.01 };
    const k = kind({ buchungszeit_factor: 2.0, weighting_factor_value: 1.0 });
    expect(berechneBayernFoerdererloesProKind(k, amtlich)).toBeCloseTo(3663.78, 2);
  });
});

describe("berechneBayernFoerdererloesGesamt", () => {
  it("summiert über mehrere Kinder", () => {
    const rows = [kind({ weighting_factor_value: 1.0 }), kind({ weighting_factor_value: 2.0 })];
    const summe = berechneBayernFoerdererloesGesamt(rows, basiswert);
    expect(summe).toBeCloseTo(1.75 * 1.0 * 1100 + 1.75 * 2.0 * 1100, 10);
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


describe("Bayern: staatlich + kommunal (Art. 21/22 BayKiBiG, § 24/§ 20 AVBayKiBiG)", () => {
  const amtlich: BayernBasiswert = { basiswert: 1563.88, qualitaetsbonus: 268.01 };

  it("Kindergartenkind 1,75 × 1,0: staatlich mit Qualitätsbonus, kommunal nur Basiswert", () => {
    const f = berechneBayernFoerderungProKind(kind({ buchungszeit_factor: 1.75, weighting_factor_value: 1.0 }), amtlich, false);
    expect(f.staatlich).toBeCloseTo((1563.88 + 268.01) * 1.75, 6);
    expect(f.kommunal).toBeCloseTo(1563.88 * 1.75, 6);
  });

  it("U3-Kind 2,0 × 2,0: Zuschlag +0,15, dafür kein Qualitätsbonus; Eigenanteil ohne Zuschlag", () => {
    const f = berechneBayernFoerderungProKind(kind({ buchungszeit_factor: 2.0, weighting_factor_value: 2.0 }), amtlich, true);
    expect(f.staatlich).toBeCloseTo(1563.88 * 2.15 * 2.0, 6);
    expect(f.kommunal).toBeCloseTo(1563.88 * 2.0 * 2.0, 6);
    expect(f.staatlich + f.kommunal).toBeCloseTo(12980.2, 1);
  });

  it("ohne Buchungszeit keine Förderung", () => {
    expect(berechneBayernFoerderungProKind(kind({ buchungszeit_factor: null }), amtlich, false)).toEqual({ staatlich: 0, kommunal: 0 });
  });

  it("istU3FuerFoerderung: unter 3, Krippe bis Kindergartenjahresende, Kindergarten sofort nicht mehr", () => {
    expect(istU3FuerFoerderung("2024-03-14", "krippe", "2026-10-01")).toBe(true);
    expect(istU3FuerFoerderung("2023-10-01", "krippe", "2026-10-01")).toBe(true); // drittes Jahr gerade vollendet, bis 31.08.2027
    expect(istU3FuerFoerderung("2023-10-01", "krippe", "2027-08-31")).toBe(true);
    expect(istU3FuerFoerderung("2023-10-01", "krippe", "2027-09-01")).toBe(false);
    expect(istU3FuerFoerderung("2023-03-14", "krippe", "2026-10-01")).toBe(false); // 3 seit 03/2026, Kindergartenjahr endete 31.08.2026
    expect(istU3FuerFoerderung("2023-10-01", "kindergarten", "2026-10-01")).toBe(false);
    expect(istU3FuerFoerderung(undefined, null, "2026-10-01", "u3")).toBe(true);
  });

  it("Gesamt: U3-Zuschlag nur bis 31.12.2026, ein Kind zählt einmal mit höchstem Gewichtungsfaktor", () => {
    const kontext = { geburtsdatumByKindId: new Map([["a", "2025-05-01"]]), gruppenartByGruppeId: new Map<string, string | null>() };
    const zeilen = [
      kind({ kind_id: "a", buchungszeit_factor: 2.0, weighting_factor_value: 2.0 }),
      kind({ kind_id: "a", buchungszeit_factor: 2.0, weighting_factor_value: 1.3 }),
    ];
    const in2026 = berechneBayernFoerderungGesamt(zeilen, amtlich, kontext, "2026-10-01");
    expect(in2026.staatlich).toBeCloseTo(1563.88 * 2.15 * 2.0, 6);
    const in2027 = berechneBayernFoerderungGesamt(zeilen, amtlich, kontext, "2027-02-01");
    expect(in2027.staatlich).toBeCloseTo((1563.88 + 268.01) * 2.0 * 2.0, 6);
    expect(berechneBayernFoerderungGesamt(zeilen, null, kontext, "2026-10-01")).toEqual({ staatlich: 0, kommunal: 0 });
  });
});

describe("berechneTeamkraeftepauschaleJahr (Bayern ab 2027)", () => {
  const s2027: BayernBasiswert = { basiswert: 1563.88, qualitaetsbonus: 693.28, teamkraefteBis50: 500, teamkraefteUeber50: 167.61, teamkraefteMaxPlaetze: 150 };

  it("bis 50 Plätze: nur der erste Satz", () => {
    expect(berechneTeamkraeftepauschaleJahr(40, s2027)).toBe(40 * 500);
  });

  it("über 50 Plätze: erste 50 zum ersten Satz, der Rest zum zweiten", () => {
    expect(berechneTeamkraeftepauschaleJahr(80, s2027)).toBeCloseTo(50 * 500 + 30 * 167.61, 6);
  });

  it("gedeckelt bei 150 Plätzen", () => {
    expect(berechneTeamkraeftepauschaleJahr(160, s2027)).toBeCloseTo(50 * 500 + 100 * 167.61, 6);
    expect(berechneTeamkraeftepauschaleJahr(160, s2027)).toBe(berechneTeamkraeftepauschaleJahr(150, s2027));
  });

  it("2026 (Sätze 0) oder keine Basiswert-Fassung: 0", () => {
    expect(berechneTeamkraeftepauschaleJahr(80, { basiswert: 1563.88, qualitaetsbonus: 268.01, teamkraefteBis50: 0, teamkraefteUeber50: 0 })).toBe(0);
    expect(berechneTeamkraeftepauschaleJahr(80, { basiswert: 1563.88, qualitaetsbonus: 268.01 })).toBe(0);
    expect(berechneTeamkraeftepauschaleJahr(80, null)).toBe(0);
  });

  it("ab 2028 höhere Sätze", () => {
    const s2028: BayernBasiswert = { ...s2027, teamkraefteBis50: 700, teamkraefteUeber50: 242.37 };
    expect(berechneTeamkraeftepauschaleJahr(60, s2028)).toBeCloseTo(50 * 700 + 10 * 242.37, 6);
  });

  it("negative oder leere Platzzahl ergibt 0", () => {
    expect(berechneTeamkraeftepauschaleJahr(0, s2027)).toBe(0);
    expect(berechneTeamkraeftepauschaleJahr(-5, s2027)).toBe(0);
  });
});
