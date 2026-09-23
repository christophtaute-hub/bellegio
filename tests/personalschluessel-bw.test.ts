import { describe, expect, it } from "vitest";
import {
  berechneSollVzaeBW,
  buildBWPersonalplanung,
  hatRandzeitSplit,
  type BWGruppe,
  type BWPersonalschluesselRow,
} from "@/lib/team/personalschluessel-bw";

// Reale Referenzwerte aus § 1 KiTaVO / der KVJS-Berechnungshilfe (siehe lib/team/personalschluessel-bw.ts).
// "regelgruppe" (ohne Altersmischung) hat keine Randzeit-Trennung, "ganztagsgruppe" und "kinderkrippe" schon.
const tabelle: BWPersonalschluesselRow[] = [
  { betriebsform: "regelgruppe", altersmischung: false, referenzOeffnungszeitStunden: 6, referenzVzae: 1.8, stellenProStunde: 0.3 },
  { betriebsform: "ganztagsgruppe", altersmischung: false, referenzOeffnungszeitStunden: 7, referenzVzae: 2.3, stellenProStunde: 0.329 },
  { betriebsform: "kinderkrippe", altersmischung: false, referenzOeffnungszeitStunden: 7, referenzVzae: 2.06, stellenProStunde: 0.294 },
];

function gruppe(partial: Partial<BWGruppe>): BWGruppe {
  return {
    id: "g1",
    name: "Gruppe",
    bwBetriebsform: "ganztagsgruppe",
    bwAltersmischung: false,
    bwOeffnungszeitStunden: 7,
    bwRandzeitStunden: null,
    ...partial,
  };
}

describe("hatRandzeitSplit", () => {
  it("nur die reine Halbtags-/Regelgruppe ohne Altersmischung rechnet ohne Randzeit-Trennung", () => {
    expect(hatRandzeitSplit("halbtagsgruppe", false)).toBe(false);
    expect(hatRandzeitSplit("regelgruppe", false)).toBe(false);
    expect(hatRandzeitSplit("halbtagsgruppe", true)).toBe(true);
    expect(hatRandzeitSplit("regelgruppe", true)).toBe(true);
    expect(hatRandzeitSplit("verlaengerte_oeffnungszeit", false)).toBe(true);
    expect(hatRandzeitSplit("ganztagsgruppe", false)).toBe(true);
    expect(hatRandzeitSplit("kinderkrippe", false)).toBe(true);
  });
});

describe("Baden-Württemberg: Soll-VZÄ ohne Randzeit-Trennung (reine Regelgruppe)", () => {
  const regel = (partial: Partial<BWGruppe> = {}) =>
    gruppe({ bwBetriebsform: "regelgruppe", bwOeffnungszeitStunden: 6, ...partial });

  it("nimmt bei Referenz-Öffnungszeit genau den Referenzwert", () => {
    expect(berechneSollVzaeBW(regel(), tabelle)).toBeCloseTo(1.8, 10);
  });

  it("skaliert je Stunde über der Referenz: 7 statt 6 Std. = 1,8 + 1 × 0,3", () => {
    expect(berechneSollVzaeBW(regel({ bwOeffnungszeitStunden: 7 }), tabelle)).toBeCloseTo(2.1, 10);
  });

  it("skaliert auch nach unten: 4 statt 6 Std. = 1,8 − 2 × 0,3", () => {
    expect(berechneSollVzaeBW(regel({ bwOeffnungszeitStunden: 4 }), tabelle)).toBeCloseTo(1.2, 10);
  });

  it("nutzt ohne Öffnungszeit die Referenz", () => {
    expect(berechneSollVzaeBW(regel({ bwOeffnungszeitStunden: null }), tabelle)).toBeCloseTo(1.8, 10);
  });

  it("Randzeit hat hier keinen Einfluss (keine Trennung bei dieser Betriebsform)", () => {
    expect(berechneSollVzaeBW(regel({ bwRandzeitStunden: 3 }), tabelle)).toBeCloseTo(1.8, 10);
  });
});

describe("Baden-Württemberg: Soll-VZÄ mit Randzeit-Trennung (§ 1 Abs. 2 KiTaVO)", () => {
  it("nimmt bei Referenz-Öffnungszeit und Standard-Randzeit (1 Std.) genau den Referenzwert", () => {
    expect(berechneSollVzaeBW(gruppe({}), tabelle)).toBeCloseTo(2.3, 10);
    expect(berechneSollVzaeBW(gruppe({ bwRandzeitStunden: 1 }), tabelle)).toBeCloseTo(2.3, 10);
  });

  it("null-Randzeit fällt auf den gesetzlichen Standardwert (1 Std.) zurück", () => {
    expect(berechneSollVzaeBW(gruppe({ bwRandzeitStunden: null }), tabelle)).toBeCloseTo(2.3, 10);
  });

  it("mehr Randzeit bei gleicher Öffnungszeit erhöht den Bedarf (Randzeit zählt einfach, Hauptbetreuung doppelt)", () => {
    // Hauptbetreuung 7-2=5 Std. × (2×2,3/13) + 2 Std. Randzeit × (2,3/13) = 27,6/13
    expect(berechneSollVzaeBW(gruppe({ bwRandzeitStunden: 2 }), tabelle)).toBeCloseTo(27.6 / 13, 8);
  });

  it("weniger Randzeit bei gleicher Öffnungszeit senkt den Bedarf entsprechend", () => {
    // Hauptbetreuung 7-0=7 Std. × (4,6/13) + 0 Std. Randzeit = 32,2/13
    expect(berechneSollVzaeBW(gruppe({ bwRandzeitStunden: 0 }), tabelle)).toBeCloseTo(32.2 / 13, 8);
  });

  it("längere Öffnungszeit bei unveränderter Standard-Randzeit skaliert nur die Hauptbetreuungszeit", () => {
    // 9 statt 7 Std. Öffnungszeit, weiterhin 1 Std. Randzeit: Hauptbetreuung 8 Std. × (4,6/13) + 1 × (2,3/13) = 39,1/13
    expect(berechneSollVzaeBW(gruppe({ bwOeffnungszeitStunden: 9 }), tabelle)).toBeCloseTo(39.1 / 13, 8);
  });

  it("gilt auch für die Kinderkrippe (referenzVzae 2,06 bei 7 Std./1 Std. Randzeit)", () => {
    expect(
      berechneSollVzaeBW(gruppe({ bwBetriebsform: "kinderkrippe", bwOeffnungszeitStunden: 7 }), tabelle)
    ).toBeCloseTo(2.06, 10);
  });

  it("gibt 0 zurück, wenn keine Betriebsform oder keine passende Zeile existiert", () => {
    expect(berechneSollVzaeBW(gruppe({ bwBetriebsform: null }), tabelle)).toBe(0);
    expect(berechneSollVzaeBW(gruppe({ bwBetriebsform: "unbekannt" }), tabelle)).toBe(0);
    expect(berechneSollVzaeBW(gruppe({ bwAltersmischung: true }), tabelle)).toBe(0);
  });
});

describe("Baden-Württemberg: Gesamtplanung", () => {
  it("summiert die Gruppen: Ganztag 2,3 + Krippe 2,06 = 4,36 VZÄ Soll", () => {
    const plan = buildBWPersonalplanung(
      [gruppe({}), gruppe({ id: "g2", bwBetriebsform: "kinderkrippe", bwOeffnungszeitStunden: 7 })],
      tabelle,
      4.36 * 39,
      39
    );
    expect(plan.sollVzaeGesamt).toBeCloseTo(4.36, 10);
    expect(plan.istVzaeGesamt).toBeCloseTo(4.36, 10);
    expect(plan.ampel).toBe("gruen");
  });

  it("Ampel: ab 90 % des Solls gelb, darunter rot", () => {
    const gruppen = [gruppe({})]; // Soll 2,3
    expect(buildBWPersonalplanung(gruppen, tabelle, 2.2 * 39, 39).ampel).toBe("gelb");
    expect(buildBWPersonalplanung(gruppen, tabelle, 1.5 * 39, 39).ampel).toBe("rot");
  });

  it("ohne Soll ist die Ampel grün", () => {
    expect(buildBWPersonalplanung([], tabelle, 0, 39).ampel).toBe("gruen");
  });
});
