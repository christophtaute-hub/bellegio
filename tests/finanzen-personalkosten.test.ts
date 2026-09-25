import { describe, expect, it } from "vitest";
import {
  berechnePersonalkostenProMitarbeiter,
  berechnePersonalkostenGesamt,
  type TeamVerguetungRow,
  type PersonalkostenErgebnisProMitarbeiter,
} from "@/lib/finanzen/personalkosten";

const tvoedTabelle = new Map<string, number>([
  ["S8a::3", 4772.18],
  ["S3::1", 3743.84],
]);

function mitglied(partial: Partial<TeamVerguetungRow>): TeamVerguetungRow {
  return {
    teamId: "t1",
    wochenstunden: 39,
    entgeltgruppe: null,
    stufe: null,
    monatsgehaltManuell: null,
    ...partial,
  };
}

describe("berechnePersonalkostenProMitarbeiter", () => {
  it("manuelles Override hat Vorrang vor TVöD, auch wenn beides gesetzt ist", () => {
    const row = mitglied({ monatsgehaltManuell: 5000, entgeltgruppe: "S8a", stufe: 3 });
    const ergebnis = berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39);
    expect(ergebnis).toEqual({ teamId: "t1", status: "berechnet", bruttoMonat: 5000, quelle: "manuell" });
  });

  it("Teilzeit skaliert das manuelle Override linear", () => {
    const row = mitglied({ monatsgehaltManuell: 5000, wochenstunden: 19.5 });
    const ergebnis = berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39);
    expect(ergebnis).toMatchObject({ status: "berechnet", bruttoMonat: 2500 });
  });

  it("TVöD-Entgeltgruppe+Stufe ohne Override wird aus der Tabelle aufgelöst, Teilzeit korrekt skaliert", () => {
    const row = mitglied({ entgeltgruppe: "S8a", stufe: 3, wochenstunden: 19.5 });
    const ergebnis = berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39);
    expect(ergebnis).toEqual({ teamId: "t1", status: "berechnet", bruttoMonat: 4772.18 / 2, quelle: "tvoed" });
  });

  it("weder Override noch Entgeltgruppe/Stufe gesetzt: 'nicht_erfasst', keine stillschweigende 0", () => {
    const row = mitglied({});
    expect(berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39)).toEqual({ teamId: "t1", status: "nicht_erfasst" });
  });

  it("Entgeltgruppe/Stufe gesetzt, aber diese Kombination existiert nicht in der Tabelle: ebenfalls 'nicht_erfasst', kein Wurf", () => {
    const row = mitglied({ entgeltgruppe: "S99", stufe: 1 });
    expect(() => berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39)).not.toThrow();
    expect(berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39)).toEqual({ teamId: "t1", status: "nicht_erfasst" });
  });

  it("nur Entgeltgruppe ohne Stufe gesetzt: 'nicht_erfasst'", () => {
    const row = mitglied({ entgeltgruppe: "S8a", stufe: null });
    expect(berechnePersonalkostenProMitarbeiter(row, tvoedTabelle, 39)).toEqual({ teamId: "t1", status: "nicht_erfasst" });
  });
});

describe("berechnePersonalkostenGesamt", () => {
  const berechnet: PersonalkostenErgebnisProMitarbeiter[] = [
    { teamId: "t1", status: "berechnet", bruttoMonat: 4000, quelle: "tvoed" },
    { teamId: "t2", status: "berechnet", bruttoMonat: 2000, quelle: "manuell" },
    { teamId: "t3", status: "nicht_erfasst" },
  ];

  it("aggregiert Bruttosumme, Lohnnebenkosten% und Jahressonderzahlung% gegen bekannte Werte", () => {
    const ergebnis = berechnePersonalkostenGesamt(berechnet, 28, 85);
    expect(ergebnis.bruttoSummeMonat).toBe(6000);
    expect(ergebnis.lohnnebenkostenBetrag).toBeCloseTo(6000 * 0.28, 10);
    expect(ergebnis.jahressonderzahlungAnteilMonat).toBeCloseTo((6000 * 0.85) / 12, 10);
    expect(ergebnis.personalkostenGesamtMonat).toBeCloseTo(6000 + 6000 * 0.28 + (6000 * 0.85) / 12, 10);
    expect(ergebnis.nichtErfasst).toBe(1);
  });

  it("0 % Lohnnebenkosten: Gesamt = Brutto + Jahressonderzahlungsanteil, kein Aufschlag", () => {
    const ergebnis = berechnePersonalkostenGesamt(berechnet, 0, 85);
    expect(ergebnis.lohnnebenkostenBetrag).toBe(0);
    expect(ergebnis.personalkostenGesamtMonat).toBeCloseTo(6000 + (6000 * 0.85) / 12, 10);
  });

  it("leere Liste liefert 0 überall, nichtErfasst 0", () => {
    const ergebnis = berechnePersonalkostenGesamt([], 28, 85);
    expect(ergebnis).toEqual({
      bruttoSummeMonat: 0,
      lohnnebenkostenBetrag: 0,
      jahressonderzahlungAnteilMonat: 0,
      personalkostenGesamtMonat: 0,
      nichtErfasst: 0,
    });
  });
});
