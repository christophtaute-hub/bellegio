import { describe, expect, it } from "vitest";
import { berechneErgebnis } from "@/lib/finanzen/ergebnis";
import type { PersonalkostenGesamt } from "@/lib/finanzen/personalkosten";

function personalkosten(partial: Partial<PersonalkostenGesamt>): PersonalkostenGesamt {
  return {
    bruttoSummeMonat: 5000,
    lohnnebenkostenBetrag: 1400,
    jahressonderzahlungAnteilMonat: 354.17,
    personalkostenGesamtMonat: 6754.17,
    nichtErfasst: 0,
    ...partial,
  };
}

describe("berechneErgebnis", () => {
  it("Fördererlöse über Personalkosten ergibt ein positives Ergebnis", () => {
    const ergebnis = berechneErgebnis(10000, personalkosten({ personalkostenGesamtMonat: 6754.17 }));
    expect(ergebnis.ergebnisMonat).toBeCloseTo(10000 - 6754.17, 10);
    expect(ergebnis.ergebnisMonat).toBeGreaterThan(0);
  });

  it("Personalkosten über Fördererlöse ergibt ein negatives Ergebnis", () => {
    const ergebnis = berechneErgebnis(5000, personalkosten({ personalkostenGesamtMonat: 6754.17 }));
    expect(ergebnis.ergebnisMonat).toBeLessThan(0);
  });

  it("gibt personalkostenNichtErfasst unverändert aus der PersonalkostenGesamt weiter", () => {
    const ergebnis = berechneErgebnis(10000, personalkosten({ nichtErfasst: 3 }));
    expect(ergebnis.personalkostenNichtErfasst).toBe(3);
  });

  it("die Funktionssignatur akzeptiert nur die zwei vorgesehenen Eingaben (Scope-Regressionsschutz: kein Elternbeitrags-Term)", () => {
    expect(berechneErgebnis.length).toBe(2);
  });
});
