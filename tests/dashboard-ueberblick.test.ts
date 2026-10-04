import { describe, expect, it } from "vitest";
import { baueAufgaben, type AufgabenEingabe } from "@/lib/dashboard/aufgaben";
import { baueUebersichtPunkte, leseUebersichtParams, summiereUebersicht, uebersichtStartMonat } from "@/lib/dashboard/uebersicht";

const ruhig: AufgabenEingabe = {
  ueberbelegung: 0,
  freiePlaetze: 0,
  nachrueckerOffen: 0,
  austritteBald: 0,
  kinderOhneBuchungszeit: 0,
  personalAmpel: "gruen",
  personalText: "1 : 10,0",
  verguetungFehlt: null,
  foerderbetragFehlt: null,
};

describe("baueAufgaben", () => {
  it("liefert bei ruhiger Lage keine Aufgaben", () => {
    expect(baueAufgaben(ruhig)).toEqual([]);
  });

  it("meldet Überbelegung, fehlende Buchungszeit und Personal-Rot als Warnung vor Hinweisen", () => {
    const liste = baueAufgaben({ ...ruhig, ueberbelegung: 2, kinderOhneBuchungszeit: 1, personalAmpel: "rot", austritteBald: 3 });
    expect(liste.map((a) => a.id)).toEqual(["ueberbelegung", "personal", "ohne-buchungszeit", "austritte"]);
    expect(liste[0].text).toBe("2 Kinder mehr als Sollplätze");
    expect(liste[2].text).toBe("1 Kind ohne Buchungszeit");
    expect(liste.at(-1)?.ton).toBe("info");
  });

  it("formuliert Nachrücker je nach freiem Platz", () => {
    expect(baueAufgaben({ ...ruhig, nachrueckerOffen: 2, freiePlaetze: 1 })[0].text).toBe("1 freier Platz, 2 Nachrücker warten");
    expect(baueAufgaben({ ...ruhig, nachrueckerOffen: 1 })[0].text).toBe("1 Nachrücker wartet, aktuell kein freier Platz");
  });

  it("zeigt Finanz-Aufgaben nur, wenn Werte vorliegen (Finanzen-Recht)", () => {
    expect(baueAufgaben({ ...ruhig, verguetungFehlt: null, foerderbetragFehlt: null })).toEqual([]);
    const liste = baueAufgaben({ ...ruhig, verguetungFehlt: 2, foerderbetragFehlt: true });
    expect(liste.map((a) => a.id)).toEqual(["verguetung", "foerderbetrag"]);
    expect(baueAufgaben({ ...ruhig, verguetungFehlt: 0, foerderbetragFehlt: false })).toEqual([]);
  });
});

describe("Dashboard-Übersicht", () => {
  it("wählt Belegung, wenn kein Finanzen-Recht besteht, und kennt Kalenderjahr/Kitajahr", () => {
    expect(leseUebersichtParams("kalenderjahr", "finanzen", false)).toEqual({ zeitraum: "kalenderjahr", modus: "belegung" });
    expect(leseUebersichtParams(undefined, "finanzen", true)).toEqual({ zeitraum: "kitajahr", modus: "finanzen" });
    expect(leseUebersichtParams("quatsch", "quatsch", true)).toEqual({ zeitraum: "kitajahr", modus: "belegung" });
  });

  it("berechnet den Startmonat des Kitajahrs und des Kalenderjahrs", () => {
    expect(uebersichtStartMonat(new Date("2026-10-04T00:00:00Z"), "kitajahr", 9)).toBe("2026-09-01");
    expect(uebersichtStartMonat(new Date("2027-03-15T00:00:00Z"), "kitajahr", 9)).toBe("2026-09-01");
    expect(uebersichtStartMonat(new Date("2026-08-31T00:00:00Z"), "kitajahr", 9)).toBe("2025-09-01");
    expect(uebersichtStartMonat(new Date("2026-10-04T00:00:00Z"), "kalenderjahr", 9)).toBe("2026-01-01");
  });

  it("baut Punkte für Belegung und Finanzen", () => {
    const monate = [
      {
        month: "2026-10-01",
        belegung: { belegteMitI: 37, plaetzeNachBetriebserlaubnis: 40 },
        finanzen: { foerdererloeseMonat: 100, personalkostenMonat: 40, ergebnisMonat: 60 },
      },
    ];
    expect(baueUebersichtPunkte(monate, "belegung")[0]).toMatchObject({ erste: 37, zweite: 40, differenz: -3 });
    expect(baueUebersichtPunkte(monate, "finanzen")[0]).toMatchObject({ erste: 100, zweite: 40, differenz: 60 });
    expect(baueUebersichtPunkte(monate, "belegung")[0].label).toMatch(/Okt/);
  });

  it("summiert Finanzen und mittelt die Belegung", () => {
    const punkte = [
      { label: "Sep", erste: 100, zweite: 40, differenz: 60 },
      { label: "Okt", erste: 120, zweite: 50, differenz: 70 },
    ];
    expect(summiereUebersicht(punkte, "finanzen")).toEqual({ erste: 220, zweite: 90, differenz: 130 });
    expect(summiereUebersicht([{ label: "a", erste: 37, zweite: 40, differenz: -3 }, { label: "b", erste: 38, zweite: 40, differenz: -2 }], "belegung")).toEqual({ erste: 37.5, zweite: 40, differenz: -2.5 });
    expect(summiereUebersicht([], "finanzen")).toEqual({ erste: 0, zweite: 0, differenz: 0 });
  });
});
