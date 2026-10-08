import { describe, expect, it } from "vitest";
import { belegungStatus, stellenText } from "@/lib/ui/status";
import { baueCockpit } from "@/lib/steuerung/cockpit";
import type { SteuerungsDaten } from "@/lib/steuerung/lade-steuerung";
import type { AusblickMonat } from "@/lib/ausblick/personal-ausblick";

describe("Wörter", () => {
  it("Stellenanteile in Worten", () => {
    expect(stellenText(20, 39)).toBe("etwa eine halbe Stelle");
    expect(stellenText(39, 39)).toBe("etwa eine ganze Stelle");
    expect(stellenText(10, 39)).toBe("etwa eine Viertelstelle");
    expect(stellenText(58.5, 39)).toBe("etwa 1,5 Stellen");
  });
  it("Belegung", () => {
    expect(belegungStatus(37, 37).wort).toBe("Voll");
    expect(belegungStatus(38, 37).wort).toBe("Überbelegt");
    expect(belegungStatus(36, 37).wort).toBe("1 Platz frei");
    expect(belegungStatus(30, 37).wort).toBe("7 Plätze frei");
  });
});

function monat(m: string, p: Partial<AusblickMonat>): AusblickMonat {
  return { monat: m, ampel: "gruen", istStunden: 200, bedarfStunden: 200, fehlendeStunden: 0, sollStunden: 190, ueberhangStunden: 0, kinder: 36, detail: "", ...p };
}

function daten(monate: AusblickMonat[], satz: SteuerungsDaten["ausblick"]["satz"]): SteuerungsDaten {
  return {
    stichtag: "2026-10-05",
    vollzeitWochenstunden: 39,
    modell: "bayern",
    belegung: { belegt: 37, sollplaetze: 37, frei: 0 },
    personal: { kennzahl: { label: "Anstellungsschlüssel", value: "1 : 9,24", warnt: false, trendWert: 9.24, gesetz: { ist: "9,2 Kinder je Vollzeitkraft", vorgabe: "erlaubt sind 11,0", anteil: 0.84 } }, ampel: "gruen" },
    finanzen: null,
    handlungen: [],
    gruppen: [],
    zuordnung: { belastbar: true, quote: 1, ohneGruppeStunden: 0 },
    ausblick: {
      modell: "bayern",
      monate,
      ersteWarnung: null,
      ersterEngpass: monate.find((m) => m.ampel === "rot") ?? null,
      ersterUeberhang: monate.find((m) => m.ueberhangStunden > 0) ?? null,
      hoechsteLuecke: 0,
      verursacher: [],
      ursache: null,
      empfehlungen: [],
      ereignisse: [{ monat: "2027-04-01", typ: "austritt", text: "Peter scheidet aus (30 Wochenstunden weniger)" }],
      satz,
    },
    monate: [],
  } as unknown as SteuerungsDaten;
}

describe("baueCockpit", () => {
  it("Engpass: Satz mit Stellenanteil, Monat „fehlt“ mit Ereignis", () => {
    const d = daten(
      [monat("2026-10-01", {}), monat("2027-04-01", { ampel: "rot", istStunden: 172, sollStunden: 192, fehlendeStunden: 20 })],
      { ton: "engpass", text: "Ab April 2027 fehlen dir rund 20 Wochenstunden Personal." }
    );
    const c = baueCockpit(d);
    expect(c.satz.text).toBe("Ab April 2027 fehlen dir rund 20 Wochenstunden Personal. Das ist etwa eine halbe Stelle.");
    expect(c.monate[1]).toMatchObject({ status: "fehlt", personalProzent: 90, ereignisse: ["Peter scheidet aus (30 Wochenstunden weniger)"] });
    expect(c.monate[1].text).toContain("etwa eine halbe Stelle");
    expect(c.jetzt).toMatchObject({ belegungWort: "Voll", personalWort: "In Ordnung", personalProzent: 105 });
  });

  it("Überhang wird blau benannt, nicht rot", () => {
    const d = daten(
      [monat("2026-10-01", {}), monat("2027-09-01", { istStunden: 200, sollStunden: 100, ueberhangStunden: 100 })],
      { ton: "ok", text: "In den nächsten 2 Monaten ist beim Personal alles in Ordnung." }
    );
    const c = baueCockpit(d);
    expect(c.monate[1].status).toBe("ueberhang");
    expect(c.satz.ton).toBe("info");
    expect(c.satz.text).toContain("mehr Personal als nötig");
  });

  it("Alles in Ordnung bleibt der Satz der Ausblick-Berechnung", () => {
    const c = baueCockpit(daten([monat("2026-10-01", {})], { ton: "ok", text: "In den nächsten 1 Monaten ist beim Personal alles in Ordnung." }));
    expect(c.satz.ton).toBe("ok");
    expect(c.monate[0].status).toBe("ok");
  });
});
