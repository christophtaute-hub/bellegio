import { describe, expect, it } from "vitest";
import { berechneMonatspreis, hatPreise, KEINE_PREISE, pruefeListenpreise } from "@/lib/preise";

describe("Listenpreise", () => {
  const preise = { grundgebuehr: 49, proKind: 1.5, hinweis: null };

  it("rechnet Grundgebühr je Einrichtung plus Preis je Kind", () => {
    // 1 Einrichtung, 60 Kinder: 49 + 60 × 1,50 = 139
    expect(berechneMonatspreis(1, 60, preise)).toEqual({ grundgebuehr: 49, kinder: 90, summe: 139 });
    // 3 Einrichtungen, 175 Kinder: 147 + 262,50 = 409,50
    expect(berechneMonatspreis(3, 175, preise).summe).toBe(409.5);
  });

  it("rundet auf Cent und vermeidet Gleitkomma-Reste", () => {
    expect(berechneMonatspreis(1, 3, { grundgebuehr: 0.1, proKind: 0.2, hinweis: null }).summe).toBe(0.7);
  });

  it("fehlende Preisbestandteile zählen als 0", () => {
    expect(berechneMonatspreis(2, 10, { grundgebuehr: null, proKind: 2, hinweis: null }).summe).toBe(20);
    expect(berechneMonatspreis(2, 10, KEINE_PREISE).summe).toBe(0);
  });

  it("negative Mengen werden wie 0 behandelt", () => {
    expect(berechneMonatspreis(-1, -5, preise).summe).toBe(0);
  });

  it("erkennt, ob Preise veröffentlicht sind", () => {
    expect(hatPreise(KEINE_PREISE)).toBe(false);
    expect(hatPreise({ grundgebuehr: null, proKind: 1, hinweis: null })).toBe(true);
    expect(hatPreise({ grundgebuehr: 0, proKind: null, hinweis: null })).toBe(true);
  });

  it("prüft Eingaben des Betreibers", () => {
    expect(pruefeListenpreise({ grundgebuehr: 49, proKind: 1.5, hinweis: null })).toBeNull();
    expect(pruefeListenpreise({ grundgebuehr: null, proKind: null, hinweis: null })).toBeNull();
    expect(pruefeListenpreise({ grundgebuehr: -1, proKind: null, hinweis: null })).toMatch(/Grundgebühr/);
    expect(pruefeListenpreise({ grundgebuehr: null, proKind: Number.NaN, hinweis: null })).toMatch(/Preis je Kind/);
    expect(pruefeListenpreise({ grundgebuehr: null, proKind: 200000, hinweis: null })).toMatch(/Preis je Kind/);
    expect(pruefeListenpreise({ grundgebuehr: 1, proKind: 1, hinweis: "x".repeat(501) })).toMatch(/500/);
  });
});
