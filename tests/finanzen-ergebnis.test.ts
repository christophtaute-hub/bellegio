import { describe, expect, it } from "vitest";
import { berechneErgebnis, berechneSzenarioErgebnis, type Ergebnis } from "@/lib/finanzen/ergebnis";
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
  const heute: Ergebnis = {
    foerdererloeseMonat: 100000,
    personalkostenMonat: 20000,
    ergebnisMonat: 80000,
    personalkostenNichtErfasst: 0,
  };

  it("ohne simulierte Stundenänderung bleiben Personalkosten und Ergebnis beim heutigen Wert", () => {
    const ergebnis = berechneSzenarioErgebnis(heute, 0, 40, 4000);
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(20000, 10);
    expect(ergebnis.ergebnisSimuliert).toBeCloseTo(80000, 10);
  });

  it("mehr simulierte Stunden erhöhen die Personalkosten anteilig zur Vollzeit-Referenz und senken das Ergebnis", () => {
    // +30 Std./Woche bei 40 Std. Vollzeit-Referenz und 4.000 €/Monat Vollzeitgehalt -> 3.000 € mehr Kosten.
    const ergebnis = berechneSzenarioErgebnis(heute, 30, 40, 4000);
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(23000, 10);
    expect(ergebnis.ergebnisSimuliert).toBeCloseTo(77000, 10);
  });

  it("weniger simulierte Stunden (negatives Delta) senken die Personalkosten und erhöhen das Ergebnis", () => {
    const ergebnis = berechneSzenarioErgebnis(heute, -20, 40, 4000);
    expect(ergebnis.personalkostenSimuliert).toBeCloseTo(18000, 10);
    expect(ergebnis.ergebnisSimuliert).toBeCloseTo(82000, 10);
  });

  it("Fördererlöse bleiben in jedem Fall auf dem heutigen realen Wert fixiert", () => {
    const ohneAenderung = berechneSzenarioErgebnis(heute, 0, 40, 0);
    const mitAenderung = berechneSzenarioErgebnis(heute, 50, 40, 5000);
    expect(ohneAenderung.ergebnisSimuliert + ohneAenderung.personalkostenSimuliert).toBeCloseTo(heute.foerdererloeseMonat, 10);
    expect(mitAenderung.ergebnisSimuliert + mitAenderung.personalkostenSimuliert).toBeCloseTo(heute.foerdererloeseMonat, 10);
  });

  it("vollzeitWochenstunden von 0 führt nicht zur Division durch Null", () => {
    const ergebnis = berechneSzenarioErgebnis(heute, 10, 0, 3000);
    expect(ergebnis.personalkostenSimuliert).toBe(20000);
    expect(Number.isFinite(ergebnis.ergebnisSimuliert)).toBe(true);
  });
});
