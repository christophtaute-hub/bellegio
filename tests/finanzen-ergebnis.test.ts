import { describe, expect, it } from "vitest";
import { berechneErgebnis, berechneSzenarioErgebnis } from "@/lib/finanzen/ergebnis";
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

describe("berechneSzenarioErgebnis", () => {
  const foerdererloeseMonat = 100000;

  it("ohne Personal sind die Personalkosten 0 und das Ergebnis gleich den Fördererlösen", () => {
    const ergebnis = berechneSzenarioErgebnis(foerdererloeseMonat, [], 40, 28, 85);
    expect(ergebnis.personalkostenSimuliert).toBe(0);
    expect(ergebnis.ergebnisSimuliert).toBeCloseTo(foerdererloeseMonat, 10);
    expect(ergebnis.personalkostenNichtErfasst).toBe(0);
  });

  it("eine Vollzeit-Zeile zählt mit ihrem vollen Gehalt plus Lohnnebenkosten/Jahressonderzahlung", () => {
    // 4.000 € brutto, 28 % Lohnnebenkosten (1.120 €), 85 % Jahressonderzahlung / 12 (283,33 €).
    const ergebnis = berechneSzenarioErgebnis(foerdererloeseMonat, [{ wochenstunden: 40, gehaltVollzeit: 4000 }], 40, 28, 85);
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(4000 + 1120 + (4000 * 0.85) / 12, 10);
    expect(ergebnis.personalkostenNichtErfasst).toBe(0);
  });

  it("Teilzeit skaliert das Vollzeit-Gehalt linear", () => {
    // 20 von 40 Std. -> halbes Gehalt als Brutto-Basis.
    const ergebnis = berechneSzenarioErgebnis(foerdererloeseMonat, [{ wochenstunden: 20, gehaltVollzeit: 4000 }], 40, 0, 0);
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(2000, 10);
  });

  it("summiert mehrere Personal-Zeilen", () => {
    const ergebnis = berechneSzenarioErgebnis(
      foerdererloeseMonat,
      [
        { wochenstunden: 40, gehaltVollzeit: 3000 },
        { wochenstunden: 20, gehaltVollzeit: 4000 },
      ],
      40,
      0,
      0
    );
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(3000 + 2000, 10);
  });

  it("eine Zeile ohne Gehalt-Angabe (0) zählt als nicht erfasst und trägt nichts zur Summe bei", () => {
    const ergebnis = berechneSzenarioErgebnis(
      foerdererloeseMonat,
      [
        { wochenstunden: 40, gehaltVollzeit: 3000 },
        { wochenstunden: 30, gehaltVollzeit: 0 },
      ],
      40,
      0,
      0
    );
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(3000, 10);
    expect(ergebnis.personalkostenNichtErfasst).toBe(1);
  });

  it("Fördererlöse bleiben in jedem Fall auf dem heutigen realen Wert fixiert", () => {
    const ohnePersonal = berechneSzenarioErgebnis(foerdererloeseMonat, [], 40, 28, 85);
    const mitPersonal = berechneSzenarioErgebnis(foerdererloeseMonat, [{ wochenstunden: 40, gehaltVollzeit: 5000 }], 40, 28, 85);
    expect(ohnePersonal.ergebnisSimuliert + ohnePersonal.personalkostenSimuliert).toBeCloseTo(foerdererloeseMonat, 10);
    expect(mitPersonal.ergebnisSimuliert + mitPersonal.personalkostenSimuliert).toBeCloseTo(foerdererloeseMonat, 10);
  });

  it("vollzeitWochenstunden von 0 führt nicht zur Division durch Null", () => {
    const ergebnis = berechneSzenarioErgebnis(foerdererloeseMonat, [{ wochenstunden: 10, gehaltVollzeit: 3000 }], 0, 0, 0);
    expect(ergebnis.personalkostenSimuliert).toBe(0);
    expect(Number.isFinite(ergebnis.ergebnisSimuliert)).toBe(true);
  });
});
