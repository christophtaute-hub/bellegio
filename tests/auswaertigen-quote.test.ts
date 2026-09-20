import { describe, expect, it } from "vitest";
import { berechneAuswaertigenQuote } from "@/lib/kinder/auswaertigen-quote";

describe("Baden-Württemberg: Auswärtigen-Quote (nur beratend)", () => {
  const bestehend = ["Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Esslingen"];

  it("1 von 10 auswärtig = 10 %; ein zweites auswärtiges Kind ergibt 2/11 ≈ 18,2 % und überschreitet 10 %", () => {
    const ergebnis = berechneAuswaertigenQuote("Filderstadt", bestehend, "Stuttgart", 10);
    expect(ergebnis.anteilVorher).toBeCloseTo(10, 10);
    expect(ergebnis.anteilNachher).toBeCloseTo((2 / 11) * 100, 10);
    expect(ergebnis.ueberschreitetNachher).toBe(true);
  });

  it("ein Kind aus der Standort-Gemeinde senkt den Anteil und überschreitet nicht", () => {
    const ergebnis = berechneAuswaertigenQuote("stuttgart ", bestehend, "Stuttgart", 10);
    expect(ergebnis.anteilNachher).toBeCloseTo((1 / 11) * 100, 10);
    expect(ergebnis.ueberschreitetNachher).toBe(false);
  });

  it("genau auf der Quote ist noch erlaubt (nur echtes Überschreiten warnt)", () => {
    const ergebnis = berechneAuswaertigenQuote("Stuttgart", ["Stuttgart", "Esslingen", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart", "Stuttgart"], "Stuttgart", 10);
    expect(ergebnis.anteilNachher).toBeCloseTo(10, 10);
    expect(ergebnis.ueberschreitetNachher).toBe(false);
  });

  it("leere Gruppe: Anteil vorher 0", () => {
    expect(berechneAuswaertigenQuote("Stuttgart", [], "Stuttgart", 10).anteilVorher).toBe(0);
  });
});
