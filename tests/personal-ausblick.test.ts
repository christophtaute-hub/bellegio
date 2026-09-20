import { describe, expect, it } from "vitest";
import { berechnePersonalAusblick } from "@/lib/ausblick/personal-ausblick";
import { buildPersonalplanung, type TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function team(stunden: number): TeamPresenceRow[] {
  return [{ role_category: "fk", wochenstunden: stunden }] as TeamPresenceRow[];
}

/** Bayern-Forecast-Monat: nur die Felder, die der Ausblick liest. */
function bayernMonat(month: string, personalStunden: number, gewichtet: number, kinder = 20): ForecastMonth {
  return {
    month,
    kpis: { kinderGesamt: kinder },
    personal: { modell: "bayern", daten: buildPersonalplanung(team(personalStunden), gewichtet, gewichtet, 39) },
  } as unknown as ForecastMonth;
}

describe("Personal-Ausblick (Bayern)", () => {
  // 22 gewichtete Kinder brauchen 2,0 VZÄ = 78 Std. Ab April 2027 fehlt die Hälfte des Personals.
  const monate = [
    bayernMonat("2027-01-01", 78, 22),
    bayernMonat("2027-02-01", 78, 22),
    bayernMonat("2027-03-01", 78, 22),
    bayernMonat("2027-04-01", 39, 22, 18),
    bayernMonat("2027-05-01", 39, 22, 18),
  ];

  it("findet den ersten Engpass und die fehlenden Stunden", () => {
    const a = berechnePersonalAusblick(monate, 39, []);
    expect(a.ersterEngpass?.monat).toBe("2027-04-01");
    // Bedarf 2,0 VZÄ = 78 Std., vorhanden 39 Std. — es fehlen 39 Wochenstunden.
    expect(a.ersterEngpass?.fehlendeStunden).toBeCloseTo(39, 6);
    expect(a.hoechsteLuecke).toBeCloseTo(39, 6);
  });

  it("liefert Ist und Bedarf in Wochenstunden je Monat", () => {
    const a = berechnePersonalAusblick(monate, 39, []);
    expect(a.monate[0]).toMatchObject({ istStunden: 78, fehlendeStunden: 0 });
    expect(a.monate[0].bedarfStunden).toBeCloseTo(78, 6);
    expect(a.monate[3].istStunden).toBe(39);
    expect(a.monate[3].bedarfStunden).toBeCloseTo(78, 6);
  });

  it("formuliert einen Satz in Klartext", () => {
    const a = berechnePersonalAusblick(monate, 39, []);
    expect(a.satz).toEqual({ ton: "engpass", text: "Ab April 2027 fehlen dir rund 39 Wochenstunden Personal." });
  });

  it("sagt „Schon jetzt“, wenn der erste Monat bereits kippt", () => {
    const a = berechnePersonalAusblick(monate.slice(3), 39, []);
    expect(a.satz.text).toMatch(/^Schon jetzt fehlen dir rund 39 Wochenstunden/);
  });

  it("benennt den Austritt, der im Monat vor dem Engpass wirksam wird, als Ursache", () => {
    const a = berechnePersonalAusblick(monate, 39, [
      { name: "Julia Vogt", austritt: "2027-03-31", wochenstunden: 39 },
      { name: "Anderer Austritt", austritt: "2027-09-30", wochenstunden: 20 },
    ]);
    expect(a.verursacher.map((v) => v.name)).toEqual(["Julia Vogt"]);
    expect(a.ursache).toBe("Julia Vogt scheidet aus (39 Wochenstunden weniger).");
    expect(a.empfehlungen.join(" ")).toContain("39 Wochenstunden");
  });

  it("listet Austritte und Änderungen der Kinderzahl als Ereignisse, zeitlich sortiert", () => {
    const a = berechnePersonalAusblick(monate, 39, [
      { name: "Julia Vogt", austritt: "2027-03-31", wochenstunden: 39 },
      { name: "Außerhalb", austritt: "2028-01-31", wochenstunden: 10 },
    ]);
    expect(a.ereignisse).toEqual([
      { monat: "2027-04-01", typ: "austritt", text: "Julia Vogt scheidet aus (39 Wochenstunden weniger)" },
      { monat: "2027-04-01", typ: "kinder", text: "2 Kinder weniger" },
    ]);
  });

  it("meldet keinen Engpass, wenn alle Monate grün sind", () => {
    const a = berechnePersonalAusblick(monate.slice(0, 3), 39, []);
    expect(a.ersterEngpass).toBeNull();
    expect(a.ersteWarnung).toBeNull();
    expect(a.hoechsteLuecke).toBe(0);
    expect(a.empfehlungen).toEqual([]);
    expect(a.satz).toEqual({ ton: "ok", text: "In den nächsten 3 Monaten reicht dein Personal." });
  });

  it("liefert für eine leere Monatsliste ein leeres Ergebnis statt zu fallen", () => {
    const a = berechnePersonalAusblick([], 39, []);
    expect(a.monate).toEqual([]);
    expect(a.ersterEngpass).toBeNull();
    expect(a.satz.ton).toBe("ok");
  });

  it("zeigt bei wachsender Lücke den Höchstwert", () => {
    const a = berechnePersonalAusblick([bayernMonat("2027-01-01", 70, 22), bayernMonat("2027-02-01", 20, 22)], 39, []);
    expect(a.satz.text).toBe("Schon jetzt fehlen dir rund 8 Wochenstunden Personal. Später steigt die Lücke auf bis zu 58 Wochenstunden.");
  });
});

describe("Personal-Ausblick (Baden-Württemberg und NRW)", () => {
  it("BW: rechnet VZÄ in Wochenstunden um und spricht bei knapper Lücke von einer Wochenstunde", () => {
    const bw = {
      month: "2026-09-01",
      kpis: { kinderGesamt: 14 },
      personal: { modell: "bw", daten: { gruppen: [], sollVzaeGesamt: 6.16, istVzaeGesamt: 6.15, ampel: "gelb" } },
    } as unknown as ForecastMonth;
    const a = berechnePersonalAusblick([bw], 39, []);
    expect(a.monate[0].istStunden).toBeCloseTo(6.15 * 39, 6);
    expect(a.monate[0].bedarfStunden).toBeCloseTo(6.16 * 39, 6);
    expect(a.satz).toEqual({
      ton: "warnung",
      text: "Schon jetzt wird es knapp: Dir fehlt rund 1 Wochenstunde Personal.",
    });
  });

  it("BW: liegt das Personal knapp über dem Bedarf, sagt der Satz das", () => {
    const bw = {
      month: "2026-09-01",
      kpis: { kinderGesamt: 14 },
      personal: { modell: "bw", daten: { gruppen: [], sollVzaeGesamt: 6, istVzaeGesamt: 6.1, ampel: "gelb" } },
    } as unknown as ForecastMonth;
    expect(berechnePersonalAusblick([bw], 39, []).satz.text).toBe("Schon jetzt wird es knapp: Dein Personal liegt nur noch knapp über dem Bedarf.");
  });

  it("NRW: Fachkraft- und Ergänzungskraftlücke werden addiert", () => {
    const nrw = {
      month: "2026-09-01",
      kpis: { kinderGesamt: 30 },
      personal: {
        modell: "nrw",
        daten: { gruppen: [], sollFachkraftStundenGesamt: 105, sollErgaenzungskraftStundenGesamt: 30, istFk: 100, istEk: 20, ampel: "rot" },
      },
    } as unknown as ForecastMonth;
    const a = berechnePersonalAusblick([nrw], 39, []);
    expect(a.monate[0]).toMatchObject({ istStunden: 120, bedarfStunden: 135, fehlendeStunden: 15 });
    expect(a.satz.text).toBe("Schon jetzt fehlen dir rund 15 Wochenstunden Personal.");
  });
});
