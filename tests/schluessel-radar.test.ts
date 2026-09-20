import { describe, expect, it } from "vitest";
import { berechneSchluesselRadar } from "@/lib/radar/schluessel-radar";
import { buildPersonalplanung, type TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function team(stunden: number): TeamPresenceRow[] {
  return [{ role_category: "fk", wochenstunden: stunden }] as TeamPresenceRow[];
}

/** Bayern-Forecast-Monat: nur die Felder, die der Radar liest. */
function bayernMonat(month: string, personalStunden: number, gewichtet: number): ForecastMonth {
  return {
    month,
    personal: { modell: "bayern", daten: buildPersonalplanung(team(personalStunden), gewichtet, gewichtet, 39) },
  } as unknown as ForecastMonth;
}

describe("Schlüssel-Radar (Bayern)", () => {
  // 22 gewichtete Kinder brauchen 2,0 VZÄ = 78 Std. Ab April 2027 fehlt die Hälfte des Personals.
  const monate = [
    bayernMonat("2027-01-01", 78, 22),
    bayernMonat("2027-02-01", 78, 22),
    bayernMonat("2027-03-01", 78, 22),
    bayernMonat("2027-04-01", 39, 22),
    bayernMonat("2027-05-01", 39, 22),
  ];

  it("findet den ersten Engpass und die fehlenden Stunden", () => {
    const radar = berechneSchluesselRadar(monate, 39, []);
    expect(radar.ersterEngpass?.monat).toBe("2027-04-01");
    // Soll 2,0 VZÄ − Ist 1,0 VZÄ = 1,0 VZÄ = 39 Std.
    expect(radar.ersterEngpass?.fehlendeStunden).toBeCloseTo(39, 6);
    expect(radar.hoechsteLuecke).toBeCloseTo(39, 6);
  });

  it("benennt den Austritt, der im Monat vor dem Engpass wirksam wird, als Ursache", () => {
    const radar = berechneSchluesselRadar(monate, 39, [
      { name: "Julia Vogt", austritt: "2027-03-31", wochenstunden: 39 },
      { name: "Anderer Austritt", austritt: "2027-09-30", wochenstunden: 20 },
    ]);
    expect(radar.verursacher.map((v) => v.name)).toEqual(["Julia Vogt"]);
    expect(radar.ursache).toContain("Julia Vogt");
    expect(radar.empfehlungen.join(" ")).toContain("39 Wochenstunden");
  });

  it("meldet keinen Engpass, wenn alle Monate grün sind", () => {
    const radar = berechneSchluesselRadar(monate.slice(0, 3), 39, []);
    expect(radar.ersterEngpass).toBeNull();
    expect(radar.ersteWarnung).toBeNull();
    expect(radar.hoechsteLuecke).toBe(0);
    expect(radar.empfehlungen).toEqual([]);
  });

  it("liefert für eine leere Monatsliste ein leeres Ergebnis statt zu fallen", () => {
    const radar = berechneSchluesselRadar([], 39, []);
    expect(radar.monate).toEqual([]);
    expect(radar.ersterEngpass).toBeNull();
  });
});
