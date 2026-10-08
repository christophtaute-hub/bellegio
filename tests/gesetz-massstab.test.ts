import { describe, expect, it } from "vitest";
import { personalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import { GESETZ_STATUS, plusMinusStatus } from "@/lib/ui/status";
import type { PersonalplanungErgebnis } from "@/lib/team/personalplanung";

const bayern = (anstellungsschluessel: number | null): PersonalplanungErgebnis =>
  ({ modell: "bayern", daten: { anstellungsschluessel, mindestschluesselOk: true, gewichteteKinderzahl: 22, vzaeSoll: 2, ampel: "gruen" } }) as unknown as PersonalplanungErgebnis;

describe("Gesetzlicher Maßstab", () => {
  it("Bayern: Kinder je Vollzeitkraft gegen den erlaubten Höchstwert", () => {
    const g = personalKennzahl(bayern(9.33)).gesetz;
    expect(g.ist).toBe("9,3 Kinder je Vollzeitkraft");
    expect(g.vorgabe).toBe("erlaubt sind 11,0");
    expect(g.anteil).toBeCloseTo(9.33 / 11, 3);
  });
  it("Bayern ohne Personal: deutlich über der Grenze", () => {
    expect(personalKennzahl(bayern(null)).gesetz.anteil).toBeGreaterThan(1);
  });
  it("Baden-Württemberg: Stellen gegen die Vorgabe, Anteil = Soll durch Ist", () => {
    const g = personalKennzahl({ modell: "bw", daten: { istVzaeGesamt: 6.87, sollVzaeGesamt: 6.16, ampel: "gruen" } } as unknown as PersonalplanungErgebnis).gesetz;
    expect(g.ist).toBe("6,9 Stellen vorhanden");
    expect(g.vorgabe).toBe("vorgeschrieben sind 6,2");
    expect(g.anteil).toBeCloseTo(6.16 / 6.87, 3);
  });
  it("NRW: zu wenig Fachkraft-Stunden liegen über der Grenze", () => {
    const g = personalKennzahl({ modell: "nrw", daten: { istFk: 100, sollFachkraftStundenGesamt: 120, ampel: "rot" } } as unknown as PersonalplanungErgebnis).gesetz;
    expect(g.anteil).toBeCloseTo(1.2, 3);
  });
});

describe("Plus oder Minus", () => {
  it("benennt Plus, Minus und ausgeglichen", () => {
    expect(plusMinusStatus(4200)).toEqual({ wort: "Im Plus", ton: "plus" });
    expect(plusMinusStatus(-9189)).toEqual({ wort: "Im Minus", ton: "minus" });
    expect(plusMinusStatus(0.4)).toEqual({ wort: "Ausgeglichen", ton: "null" });
  });
  it("Gesetz-Antwort je Ampel", () => {
    expect(GESETZ_STATUS.gruen).toBe("Ja, gesetzlich in Ordnung");
    expect(GESETZ_STATUS.rot).toBe("Nein, das Personal reicht nicht");
  });
});
