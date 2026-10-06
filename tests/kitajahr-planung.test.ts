import { describe, expect, it } from "vitest";
import { berechnePlanung, type PlanungEingabe } from "@/lib/planung/kitajahr";

const gruppen = [
  { id: "k", name: "Krippe", gruppenart: "krippe", sollplaetze: 12, vorjahrKinder: 12, vorschlagKinder: 10, durchschnittsfaktor: 2 },
  { id: "g", name: "Kindergarten", gruppenart: "kindergarten", sollplaetze: 25, vorjahrKinder: 25, vorschlagKinder: 20, durchschnittsfaktor: 1 },
];
const bayern: PlanungEingabe = { modell: "bayern", vollzeitWochenstunden: 39, gruppen, personalIst: 100, sollVorschlag: 112, stundenJeGewichtetemKind: 39 / 11 };

describe("berechnePlanung", () => {
  it("Bayern: Bedarf folgt der gewichteten Kinderzahl der Planung", () => {
    const e = berechnePlanung(bayern);
    // 10 × 2 + 20 × 1 = 40 gewichtete Kinder → 40 × 39/11 ≈ 141,8 Std.
    expect(e.sollPlan).toBeCloseTo(141.8, 1);
    expect(e.luecke).toBeCloseTo(41.8, 1);
    expect(e.einstellenStunden).toBe(42);
    expect(e.satz.ton).toBe("warnung");
  });
  it("Eigene Planung ändert den Bedarf", () => {
    const e = berechnePlanung(bayern, { kinder: { k: 12, g: 25 } });
    expect(e.zeilen[0]).toMatchObject({ plan: 12, delta: 0, status: "voll" });
    expect(e.sollPlan).toBeCloseTo((12 * 2 + 25) * (39 / 11), 5);
  });
  it("Geplante Einstellungen decken die Lücke", () => {
    const e = berechnePlanung(bayern, { einstellenGeplant: 45 });
    expect(e.einstellenStunden).toBe(0);
    expect(e.satz.ton).toBe("ok");
  });
  it("Überhang bei deutlich weniger Kindern", () => {
    const e = berechnePlanung({ ...bayern, personalIst: 400 });
    expect(e.ueberhang).toBeGreaterThan(200);
    expect(e.satz.ton).toBe("info");
  });
  it("BW/NRW: Kinderzahl ändert den Bedarf nicht", () => {
    const e = berechnePlanung({ ...bayern, modell: "bw", stundenJeGewichtetemKind: null }, { kinder: { k: 1, g: 1 } });
    expect(e.bedarfOhneKinderbezug).toBe(true);
    expect(e.sollPlan).toBe(112);
  });
  it("Überbelegung wird markiert", () => {
    expect(berechnePlanung(bayern, { kinder: { k: 14 } }).zeilen[0].status).toBe("zuviel");
  });
});
