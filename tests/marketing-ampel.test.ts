import { describe, expect, it } from "vitest";
import { ampelFarbe, ampelStufen, istKritisch, schweregrad, stufeAusGrenzen, STANDARD_GRENZEN } from "@/lib/marketing/ampel";

describe("Marketing-Ampel: Stufen und Farben", () => {
  it("vierstufig: Personalbedarf und Belegung (Grün, Gelb, Orange, Rot)", () => {
    expect([0, 1, 2, 3].map((s) => ampelFarbe("belegung", s))).toEqual(["gruen", "gelb", "orange", "rot"]);
    expect(ampelStufen("personalbedarf").map((s) => s.label)).toEqual(["Grün", "Gelb", "Orange", "Rot"]);
  });
  it("dreistufig: Qualität (Grün, Gelb, Rot)", () => {
    expect([0, 1, 2].map((s) => ampelFarbe("paedagogische_qualitaet", s))).toEqual(["gruen", "gelb", "rot"]);
    expect(ampelStufen("personelle_qualitaet")).toHaveLength(3);
  });
  it("unbewertet bleibt null und ist nie kritisch", () => {
    expect(ampelFarbe("belegung", null)).toBeNull();
    expect(istKritisch("belegung", null)).toBe(false);
    expect(schweregrad("belegung", null)).toBe(-1);
  });
  it("kritisch ab Orange; bei Qualität nur Rot", () => {
    expect(istKritisch("belegung", 1)).toBe(false);
    expect(istKritisch("belegung", 2)).toBe(true);
    expect(istKritisch("paedagogische_qualitaet", 1)).toBe(false);
    expect(istKritisch("paedagogische_qualitaet", 2)).toBe(true);
  });
  it("Qualitäts-Rot zählt beim Sortieren wie Rot", () => {
    expect(schweregrad("personelle_qualitaet", 2)).toBe(3);
  });
});

describe("stufeAusGrenzen (Vorschlag aus Bellegio-Daten)", () => {
  it("Personalbedarf nach fehlenden Wochenstunden", () => {
    const g = STANDARD_GRENZEN.personalbedarf;
    expect([0, 1, 19, 20, 39, 40, 80].map((w) => stufeAusGrenzen(w, g))).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it("Belegung nach freien Plätzen", () => {
    const g = STANDARD_GRENZEN.belegung;
    expect([0, 1, 2, 3, 4, 6, 7, 12].map((n) => stufeAusGrenzen(n, g))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});
