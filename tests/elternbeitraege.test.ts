import { describe, expect, it } from "vitest";
import { berechneElternbeitraege, beitraegeJeGruppe, preiseAmStichtag } from "@/lib/finanzen/elternbeitraege";
import type { PresenceRow } from "@/lib/dashboard/presence";

const kind = (id: string, band: string | null, gruppe: string | null = "g1"): PresenceRow => ({
  kind_id: id,
  gruppe_id: gruppe,
  buchungszeit_band_id: band,
  buchungszeit_label: null,
  buchungszeit_factor: 1,
  weighting_factor_id: null,
  weighting_factor_code: null,
  weighting_factor_label: null,
  weighting_factor_value: 1,
  weighting_factor_value_fachkraftquote: 1,
});

describe("Preisliste", () => {
  const zeilen = [
    { bandId: "a", betrag: 200, gueltigAb: "2000-01-01" },
    { bandId: "a", betrag: 220, gueltigAb: "2027-01-01" },
    { bandId: "b", betrag: 300, gueltigAb: "2000-01-01" },
  ];
  it("gilt die jüngste Fassung, die zum Stichtag schon gültig war", () => {
    expect(preiseAmStichtag(zeilen, "2026-10-01").get("a")).toBe(200);
    expect(preiseAmStichtag(zeilen, "2027-01-01").get("a")).toBe(220);
  });
  it("ohne Zeilen: keine Preisliste", () => {
    expect(preiseAmStichtag([], "2026-10-01").size).toBe(0);
  });
});

describe("Elternbeiträge", () => {
  const preise = new Map([["a", 200], ["b", 300]]);
  it("summiert die Bandpreise und zählt Kinder ohne Preis", () => {
    const r = berechneElternbeitraege([kind("1", "a"), kind("2", "b"), kind("3", null), kind("4", "x")], preise);
    expect(r).toEqual({ summe: 500, kinderMitPreis: 2, kinderOhnePreis: 2 });
  });
  it("zählt ein Kind mit mehreren Gewichtungsfaktoren nur einmal", () => {
    expect(berechneElternbeitraege([kind("1", "a"), kind("1", "a")], preise).summe).toBe(200);
  });
  it("Erlös und Durchschnitt je Gruppe", () => {
    const g = beitraegeJeGruppe([kind("1", "a", "g1"), kind("2", "b", "g1"), kind("3", "a", "g2")], preise, [
      { id: "g1", name: "Sterne" },
      { id: "g2", name: "Mond" },
    ]);
    expect(g.find((x) => x.name === "Sterne")).toMatchObject({ kinder: 2, erloes: 500, durchschnitt: 250 });
    expect(g.find((x) => x.name === "Mond")).toMatchObject({ kinder: 1, erloes: 200, durchschnitt: 200 });
  });
});
