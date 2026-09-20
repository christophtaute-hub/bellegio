import { describe, expect, it } from "vitest";
import {
  berechneSollVzaeBW,
  buildBWPersonalplanung,
  type BWGruppe,
  type BWPersonalschluesselRow,
} from "@/lib/team/personalschluessel-bw";

const tabelle: BWPersonalschluesselRow[] = [
  { betriebsform: "ganztagsgruppe", altersmischung: false, referenzOeffnungszeitStunden: 9, referenzVzae: 2, stellenProStunde: 0.1 },
  { betriebsform: "kinderkrippe", altersmischung: false, referenzOeffnungszeitStunden: 8, referenzVzae: 1.5, stellenProStunde: 0.2 },
];

function gruppe(partial: Partial<BWGruppe>): BWGruppe {
  return {
    id: "g1",
    name: "Gruppe",
    bwBetriebsform: "ganztagsgruppe",
    bwAltersmischung: false,
    bwOeffnungszeitStunden: 9,
    ...partial,
  };
}

describe("Baden-Württemberg: Soll-VZÄ je Betriebsform (KiTaVO)", () => {
  it("nimmt bei Referenz-Öffnungszeit genau den Referenzwert", () => {
    expect(berechneSollVzaeBW(gruppe({}), tabelle)).toBeCloseTo(2, 10);
  });

  it("skaliert je Stunde über der Referenz: 10 statt 9 Std. = 2,0 + 1 × 0,1", () => {
    expect(berechneSollVzaeBW(gruppe({ bwOeffnungszeitStunden: 10 }), tabelle)).toBeCloseTo(2.1, 10);
  });

  it("skaliert auch nach unten: 7 statt 9 Std. = 2,0 − 2 × 0,1", () => {
    expect(berechneSollVzaeBW(gruppe({ bwOeffnungszeitStunden: 7 }), tabelle)).toBeCloseTo(1.8, 10);
  });

  it("nutzt ohne Öffnungszeit die Referenz", () => {
    expect(berechneSollVzaeBW(gruppe({ bwOeffnungszeitStunden: null }), tabelle)).toBeCloseTo(2, 10);
  });

  it("gibt 0 zurück, wenn keine Betriebsform oder keine passende Zeile existiert", () => {
    expect(berechneSollVzaeBW(gruppe({ bwBetriebsform: null }), tabelle)).toBe(0);
    expect(berechneSollVzaeBW(gruppe({ bwBetriebsform: "unbekannt" }), tabelle)).toBe(0);
    expect(berechneSollVzaeBW(gruppe({ bwAltersmischung: true }), tabelle)).toBe(0);
  });

  it("summiert die Gruppen: Ganztag 2,0 + Krippe 1,5 = 3,5 VZÄ Soll", () => {
    const plan = buildBWPersonalplanung(
      [gruppe({}), gruppe({ id: "g2", bwBetriebsform: "kinderkrippe", bwOeffnungszeitStunden: 8 })],
      tabelle,
      3.5 * 39,
      39
    );
    expect(plan.sollVzaeGesamt).toBeCloseTo(3.5, 10);
    expect(plan.istVzaeGesamt).toBeCloseTo(3.5, 10);
    expect(plan.ampel).toBe("gruen");
  });

  it("Ampel: ab 90 % des Solls gelb, darunter rot", () => {
    const gruppen = [gruppe({})]; // Soll 2,0
    expect(buildBWPersonalplanung(gruppen, tabelle, 1.9 * 39, 39).ampel).toBe("gelb");
    expect(buildBWPersonalplanung(gruppen, tabelle, 1.5 * 39, 39).ampel).toBe("rot");
  });

  it("ohne Soll ist die Ampel grün", () => {
    expect(buildBWPersonalplanung([], tabelle, 0, 39).ampel).toBe("gruen");
  });
});
