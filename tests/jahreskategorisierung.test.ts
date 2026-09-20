import { describe, expect, it } from "vitest";
import {
  bandGrenzeFuerWochenstunden,
  bandLabelFuerGrenze,
  buildJahreskategorisierung,
  wochenstundenAusBuchungszeitBand,
  wochenstundenAusWoechentlichemBand,
  wochenstundenFuerKind,
} from "@/lib/controlling/jahreskategorisierung";

describe("Band-Zuordnung (10/15/…/55 Std.)", () => {
  it("ordnet X bis unter Y zu: 14,9 → 10er-Band, 15 → 15er-Band", () => {
    expect(bandGrenzeFuerWochenstunden(14.9)).toBe(10);
    expect(bandGrenzeFuerWochenstunden(15)).toBe(15);
    expect(bandGrenzeFuerWochenstunden(39.99)).toBe(35);
    expect(bandGrenzeFuerWochenstunden(40)).toBe(40);
  });

  it("klammert Werte unter 10 Std. ins kleinste Band und über 55 ins größte", () => {
    expect(bandGrenzeFuerWochenstunden(5)).toBe(10);
    expect(bandGrenzeFuerWochenstunden(60)).toBe(55);
  });

  it("beschriftet die Bänder", () => {
    expect(bandLabelFuerGrenze(10, false)).toBe("10 bis unter 15 Std.");
    expect(bandLabelFuerGrenze(55, true)).toBe("55 Std. und mehr");
  });

  it("zählt Kinder und I-Status je Band", () => {
    const baender = buildJahreskategorisierung([
      { wochenstunden: 12, hatBehinderung: false },
      { wochenstunden: 12, hatBehinderung: true },
      { wochenstunden: 37.5, hatBehinderung: false },
    ]);
    const band10 = baender.find((b) => b.grenze === 10)!;
    const band35 = baender.find((b) => b.grenze === 35)!;
    expect(band10.anzahlKinder).toBe(2);
    expect(band10.davonMitBehinderung).toBe(1);
    expect(band35.anzahlKinder).toBe(1);
    expect(baender.reduce((s, b) => s + b.anzahlKinder, 0)).toBe(3);
  });
});

describe("Wochenstunden aus der gebuchten Zeit", () => {
  it("Bayern: tägliches Band, Mittelwert × 5 Tage (6–7 Std. → 32,5 Std.)", () => {
    expect(wochenstundenAusBuchungszeitBand({ min_hours: 6, max_hours: 7 })).toBe(32.5);
  });

  it("Bayern: offenes Band über 9 Std. nutzt die Untergrenze × 5", () => {
    expect(wochenstundenAusBuchungszeitBand({ min_hours: 9, max_hours: null })).toBe(45);
  });

  it("BW/NRW: Band ist bereits wöchentlich (35,5–40 → 37,75)", () => {
    expect(wochenstundenAusWoechentlichemBand({ min_hours: 35.5, max_hours: 40 })).toBe(37.75);
  });

  it("wochenstundenFuerKind: Bayern ohne Band ist nicht zuordenbar", () => {
    expect(wochenstundenFuerKind({ booking_time_bands: null, gruppen: null }, "by")).toBeNull();
  });

  it("wochenstundenFuerKind: das Pro-Kind-Band hat Vorrang vor der Gruppen-Näherung", () => {
    const kind = {
      booking_time_bands: { min_hours: 25, max_hours: 30 },
      gruppen: { bw_oeffnungszeit_stunden: 9, nrw_buchungszeit_stunden: 45 },
    };
    expect(wochenstundenFuerKind(kind, "bw")).toBe(27.5);
    expect(wochenstundenFuerKind(kind, "nrw")).toBe(27.5);
  });

  it("wochenstundenFuerKind: ohne Band Gruppen-Fallback (BW Öffnungszeit × 5, NRW Buchungszeit)", () => {
    const kind = {
      booking_time_bands: null,
      gruppen: { bw_oeffnungszeit_stunden: 8, nrw_buchungszeit_stunden: 35 },
    };
    expect(wochenstundenFuerKind(kind, "bw")).toBe(40);
    expect(wochenstundenFuerKind(kind, "nrw")).toBe(35);
  });
});
