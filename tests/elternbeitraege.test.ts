import { describe, expect, it } from "vitest";
import { baueKindKontext, berechneElternbeitraege, beitraegeJeGruppe, erhaeltZuschuss, preisMitGeschwister, preisSchluessel, preiseAmStichtag } from "@/lib/finanzen/elternbeitraege";
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
    expect(preiseAmStichtag(zeilen, "2026-10-01").get(preisSchluessel("a", null, false))).toBe(200);
    expect(preiseAmStichtag(zeilen, "2027-01-01").get(preisSchluessel("a", null, false))).toBe(220);
  });
  it("ohne Zeilen: keine Preisliste", () => {
    expect(preiseAmStichtag([], "2026-10-01").size).toBe(0);
  });
});

describe("Elternbeiträge", () => {
  const preise = new Map([[preisSchluessel("a", null, false), 200], [preisSchluessel("b", null, false), 300]]);
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

describe("Preisliste nach Gruppenart und Wohnsitz (Münchner Liste als Beispiel)", () => {
  // Bänder: k = Krippe 8–9 h (≤45 Std.), g = Kindergarten 6–7 h (≤35 Std.)
  const preise = new Map([
    [preisSchluessel("k", "krippe", false), 224],
    [preisSchluessel("k", "krippe", true), 549],
    [preisSchluessel("g", "kindergarten", false), 69],
    [preisSchluessel("g", "kindergarten", true), 192],
  ]);
  const kontext = baueKindKontext(
    [
      { id: "gk", gruppenart: "krippe" },
      { id: "gg", gruppenart: "kindergarten" },
    ],
    [
      { id: "1", wohnort: "München" },
      { id: "2", wohnort: "Freising" },
      { id: "3", wohnort: " münchen " },
      { id: "4", wohnort: null },
    ],
    "München"
  );
  it("erkennt Kinder von außerhalb ohne Groß-/Kleinschreibung; leerer Wohnort zählt zum Standort", () => {
    expect([...kontext.auswaertigeKindIds]).toEqual(["2"]);
  });
  it("wählt den Preis nach Gruppenart und Wohnsitz", () => {
    const rows = [kind("1", "k", "gk"), kind("2", "k", "gk"), kind("3", "g", "gg"), kind("4", "g", "gg")];
    const r = berechneElternbeitraege(rows, preise, kontext);
    expect(r).toEqual({ summe: 224 + 549 + 69 + 69, kinderMitPreis: 4, kinderOhnePreis: 0 });
  });
  it("fällt bei fehlendem Auswärts-Preis auf den Standardpreis zurück", () => {
    const nurStandard = new Map([[preisSchluessel("k", "krippe", false), 224]]);
    expect(berechneElternbeitraege([kind("2", "k", "gk")], nurStandard, kontext).summe).toBe(224);
  });
  it("ohne Standort-Gemeinde gibt es keine Auswärtigen", () => {
    expect(baueKindKontext([], [{ id: "2", wohnort: "Freising" }], null).auswaertigeKindIds.size).toBe(0);
  });
});

describe("Geschwisterermäßigung und Elternbeitragszuschuss", () => {
  const regeln = { zweitProzent: 50, abDrittProzent: 0, zuschussBis: "2026-12-31" };
  const kontext = baueKindKontext(
    [],
    [
      { id: "klein", wohnort: null, geburtsdatum: "2024-05-16", geschwisterNummer: 2 },
      { id: "dritt", wohnort: null, geburtsdatum: "2024-09-01", geschwisterNummer: 3 },
      { id: "gross", wohnort: null, geburtsdatum: "2020-12-24", geschwisterNummer: 2 },
      { id: "einzel", wohnort: null, geburtsdatum: "2024-01-01", geschwisterNummer: 1 },
    ],
    null,
    regeln
  );
  it("Zuschuss gibt es ab 1. September des Jahres, in dem das Kind drei wird, bis zum Enddatum", () => {
    expect(erhaeltZuschuss("2023-10-01", "2026-08-31", "2026-12-31")).toBe(false);
    expect(erhaeltZuschuss("2023-10-01", "2026-09-01", "2026-12-31")).toBe(true);
    expect(erhaeltZuschuss("2023-10-01", "2027-01-01", "2026-12-31")).toBe(false);
    expect(erhaeltZuschuss("2023-10-01", "2026-10-01", null)).toBe(false);
  });
  it("2. Kind zahlt die Hälfte, ab dem 3. Kind nichts, das 1. Kind den vollen Preis", () => {
    expect(preisMitGeschwister(200, "klein", kontext, "2026-10-08")).toBe(100);
    expect(preisMitGeschwister(200, "dritt", kontext, "2026-10-08")).toBe(0);
    expect(preisMitGeschwister(200, "einzel", kontext, "2026-10-08")).toBe(200);
  });
  it("Kinder mit Zuschuss bekommen keine Ermäßigung — nach Ende des Zuschusses schon", () => {
    expect(preisMitGeschwister(100, "gross", kontext, "2026-10-08")).toBe(100);
    expect(preisMitGeschwister(100, "gross", kontext, "2027-01-01")).toBe(50);
  });
  it("ohne Regeln bleibt der Preis unverändert", () => {
    const ohne = baueKindKontext([], [{ id: "klein", wohnort: null, geburtsdatum: "2024-05-16", geschwisterNummer: 2 }], null);
    expect(preisMitGeschwister(200, "klein", ohne, "2026-10-08")).toBe(200);
  });
});
