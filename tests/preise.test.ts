import { describe, expect, it } from "vitest";
import { berechneMonatspreis, hatPreise, KEINE_PREISE, pruefeListenpreise, verteileAufStaffel, type Listenpreise } from "@/lib/preise";

describe("verteileAufStaffel", () => {
  it("verteilt Kinder auf die drei Stufen (Grenzen 30/60)", () => {
    expect(verteileAufStaffel(0)).toEqual({ stufe1: 0, stufe2: 0, stufe3: 0 });
    expect(verteileAufStaffel(30)).toEqual({ stufe1: 30, stufe2: 0, stufe3: 0 });
    expect(verteileAufStaffel(31)).toEqual({ stufe1: 30, stufe2: 1, stufe3: 0 });
    expect(verteileAufStaffel(60)).toEqual({ stufe1: 30, stufe2: 30, stufe3: 0 });
    expect(verteileAufStaffel(61)).toEqual({ stufe1: 30, stufe2: 30, stufe3: 1 });
    expect(verteileAufStaffel(100)).toEqual({ stufe1: 30, stufe2: 30, stufe3: 40 });
  });

  it("negative Werte zählen als 0", () => {
    expect(verteileAufStaffel(-5)).toEqual({ stufe1: 0, stufe2: 0, stufe3: 0 });
  });
});

describe("Listenpreise (Variante B: Grundgebühr + gestaffelter Kind-Preis je Einrichtung)", () => {
  const preise: Listenpreise = { grundgebuehr: 15, proKind1Bis30: 1.2, proKind31Bis60: 0.8, proKindAb61: 0.6, hinweis: null };

  it("rechnet Grundgebühr je Einrichtung plus gestaffelten Preis je Kind", () => {
    // 1 Einrichtung, 60 Kinder: 15 + (30×1,20 + 30×0,80) = 15 + 60 = 75
    expect(berechneMonatspreis(1, 60, preise)).toEqual({ grundgebuehr: 15, kinder: 60, summe: 75 });
    // 1 Einrichtung, 75 Kinder: 15 + (30×1,20 + 30×0,80 + 15×0,60) = 15 + (36+24+9) = 84
    expect(berechneMonatspreis(1, 75, preise).summe).toBe(84);
  });

  it("die Staffel gilt je Einrichtung — mehrere gleich große Einrichtungen zählen jeweils eigenständig", () => {
    // 3 Einrichtungen mit je 60 Kindern: 3 × 75 = 225 (nicht 15×3 + gestaffelt über 180 Kinder gebündelt)
    expect(berechneMonatspreis(3, 60, preise).summe).toBe(225);
  });

  it("rundet auf Cent und vermeidet Gleitkomma-Reste", () => {
    expect(berechneMonatspreis(1, 3, { grundgebuehr: 0.1, proKind1Bis30: 0.2, proKind31Bis60: null, proKindAb61: null, hinweis: null }).summe).toBe(0.7);
  });

  it("fehlende Preisbestandteile zählen als 0", () => {
    expect(
      berechneMonatspreis(2, 10, { grundgebuehr: null, proKind1Bis30: 2, proKind31Bis60: null, proKindAb61: null, hinweis: null }).summe
    ).toBe(40);
    expect(berechneMonatspreis(2, 10, KEINE_PREISE).summe).toBe(0);
  });

  it("negative Mengen werden wie 0 behandelt", () => {
    expect(berechneMonatspreis(-1, -5, preise).summe).toBe(0);
  });

  it("erkennt, ob Preise veröffentlicht sind", () => {
    expect(hatPreise(KEINE_PREISE)).toBe(false);
    expect(hatPreise({ grundgebuehr: null, proKind1Bis30: 1, proKind31Bis60: null, proKindAb61: null, hinweis: null })).toBe(true);
    expect(hatPreise({ grundgebuehr: 0, proKind1Bis30: null, proKind31Bis60: null, proKindAb61: null, hinweis: null })).toBe(true);
  });

  it("prüft Eingaben des Betreibers", () => {
    expect(pruefeListenpreise({ grundgebuehr: 15, proKind1Bis30: 1.2, proKind31Bis60: 0.8, proKindAb61: 0.6, hinweis: null })).toBeNull();
    expect(pruefeListenpreise({ grundgebuehr: null, proKind1Bis30: null, proKind31Bis60: null, proKindAb61: null, hinweis: null })).toBeNull();
    expect(pruefeListenpreise({ grundgebuehr: -1, proKind1Bis30: null, proKind31Bis60: null, proKindAb61: null, hinweis: null })).toMatch(/Grundgebühr/);
    expect(pruefeListenpreise({ grundgebuehr: null, proKind1Bis30: Number.NaN, proKind31Bis60: null, proKindAb61: null, hinweis: null })).toMatch(/1\.–30\./);
    expect(pruefeListenpreise({ grundgebuehr: null, proKind1Bis30: null, proKind31Bis60: 200000, proKindAb61: null, hinweis: null })).toMatch(/31\.–60\./);
    expect(pruefeListenpreise({ grundgebuehr: 1, proKind1Bis30: 1, proKind31Bis60: 1, proKindAb61: 1, hinweis: "x".repeat(501) })).toMatch(/500/);
  });
});
