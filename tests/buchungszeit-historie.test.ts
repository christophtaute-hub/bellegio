import { describe, expect, it } from "vitest";
import { resolveBandAmStichtag, sollHistorieGeschriebenWerden, type HistorieEintrag } from "@/lib/kinder/buchungszeit-historie";

describe("Buchungszeit zum Stichtag auflösen", () => {
  const historie: HistorieEintrag[] = [
    { gueltig_ab: "2024-09-01", buchungszeit_band_id: "band-6-7" },
    { gueltig_ab: "2026-01-01", buchungszeit_band_id: "band-7-8" },
    { gueltig_ab: "2026-09-01", buchungszeit_band_id: "band-8-9" },
  ];

  it("wählt die zuletzt vor dem Stichtag gültige Zeile", () => {
    expect(resolveBandAmStichtag(historie, "2025-06-01")).toBe("band-6-7");
    expect(resolveBandAmStichtag(historie, "2026-01-01")).toBe("band-7-8");
    expect(resolveBandAmStichtag(historie, "2026-06-01")).toBe("band-7-8");
    expect(resolveBandAmStichtag(historie, "2027-01-01")).toBe("band-8-9");
  });

  it("liefert null vor der ersten Zeile", () => {
    expect(resolveBandAmStichtag(historie, "2024-08-31")).toBeNull();
  });

  it("ist unabhängig von der Reihenfolge der Eingabe", () => {
    const durcheinander = [...historie].reverse();
    expect(resolveBandAmStichtag(durcheinander, "2026-06-01")).toBe("band-7-8");
  });

  it("eine leere Historie liefert null", () => {
    expect(resolveBandAmStichtag([], "2026-01-01")).toBeNull();
  });

  it("kommt mit einem null-Band in der Historie klar (Buchungszeit entfernt)", () => {
    const h: HistorieEintrag[] = [{ gueltig_ab: "2026-01-01", buchungszeit_band_id: "band-6-7" }, { gueltig_ab: "2026-06-01", buchungszeit_band_id: null }];
    expect(resolveBandAmStichtag(h, "2026-07-01")).toBeNull();
    expect(resolveBandAmStichtag(h, "2026-03-01")).toBe("band-6-7");
  });
});

describe("Wann wird ein neuer Historie-Eintrag geschrieben", () => {
  it("nur bei tatsächlicher Änderung", () => {
    expect(sollHistorieGeschriebenWerden("band-a", "band-a")).toBe(false);
    expect(sollHistorieGeschriebenWerden(null, null)).toBe(false);
    expect(sollHistorieGeschriebenWerden("band-a", "band-b")).toBe(true);
    expect(sollHistorieGeschriebenWerden(null, "band-b")).toBe(true);
    expect(sollHistorieGeschriebenWerden("band-a", null)).toBe(true);
  });
});
