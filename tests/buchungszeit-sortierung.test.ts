import { describe, expect, it } from "vitest";
import { buchungszeitSortWert, buildCompositionMatrix, type PresenceRow } from "@/lib/dashboard/presence";

function zeile(label: string | null, faktor: number | null): PresenceRow {
  return {
    kind_id: Math.random().toString(),
    gruppe_id: null,
    buchungszeit_band_id: label ? "b" : null,
    buchungszeit_label: label,
    buchungszeit_factor: faktor,
    weighting_factor_id: null,
    weighting_factor_code: null,
    weighting_factor_label: null,
    weighting_factor_value: 1,
    weighting_factor_value_fachkraftquote: 1,
  };
}

describe("Buchungszeit von niedrig nach hoch", () => {
  it("liest die erste Zahl aus der Bezeichnung", () => {
    expect(buchungszeitSortWert("6-7h")).toBe(6);
    expect(buchungszeitSortWert("35,5h-40h")).toBe(35.5);
    expect(buchungszeitSortWert("über 9h")).toBe(9);
    expect(buchungszeitSortWert("45h")).toBe(45);
    expect(buchungszeitSortWert("Ohne Buchungszeit")).toBe(Number.POSITIVE_INFINITY);
  });

  it("BW: alle Bänder haben Faktor 1,0 — die Reihenfolge folgt trotzdem den Stunden", () => {
    const zeilen = [zeile("40,5h-45h", 1), zeile("20,5h-25h", 1), zeile("35,5h-40h", 1), zeile("30,5h-35h", 1)];
    expect(buildCompositionMatrix(zeilen).buchungszeitLabels).toEqual(["20,5h-25h", "30,5h-35h", "35,5h-40h", "40,5h-45h"]);
  });

  it("NRW: 25h vor 35h vor 45h, unabhängig von der Eingabereihenfolge", () => {
    const zeilen = [zeile("45h", 1), zeile("25h", 1), zeile("35h", 1)];
    expect(buildCompositionMatrix(zeilen).buchungszeitLabels).toEqual(["25h", "35h", "45h"]);
  });

  it("Bayern: aufsteigend bis „über 9h“, „Ohne Buchungszeit“ zuletzt", () => {
    const zeilen = [zeile("über 9h", 2.5), zeile(null, null), zeile("8-9h", 2.25), zeile("1-2h", 0.5), zeile("6-7h", 1.75)];
    expect(buildCompositionMatrix(zeilen).buchungszeitLabels).toEqual(["1-2h", "6-7h", "8-9h", "über 9h", "Ohne Buchungszeit"]);
  });

  it("zweistellige Bänder stehen nach einstelligen (nicht alphabetisch)", () => {
    const zeilen = [zeile("35h", 1), zeile("5-6h", 1.5)];
    expect(buildCompositionMatrix(zeilen).buchungszeitLabels).toEqual(["5-6h", "35h"]);
  });
});
