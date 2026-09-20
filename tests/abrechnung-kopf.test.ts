import { describe, expect, it } from "vitest";
import {
  berechneUmsatz,
  istDemoRechnung,
  jahresFenster,
  letzteRechnungen,
  monatsFenster,
  monatsReihe,
  naechsteFaelligkeiten,
  summeEntwuerfe,
  veraenderungProzent,
  verschiebeMonat,
  type KopfRechnung,
} from "@/lib/admin/einnahmen";

let zaehler = 0;
function rechnung(teil: Partial<KopfRechnung>): KopfRechnung {
  zaehler += 1;
  return {
    id: `r${zaehler}`,
    nummer: `2026-${String(zaehler).padStart(4, "0")}`,
    status: "bezahlt",
    rechnungsdatum: "2026-09-30",
    leistungszeitraumVon: "2026-09-01",
    faelligAm: "2026-10-14",
    bezahltAm: null,
    nettoSumme: 100,
    stornoVon: null,
    tragerName: "Kunde",
    ...teil,
  };
}

const heute = "2026-10-20";

describe("Abrechnung: Umsatz nach Rechnungsdatum", () => {
  const rows = [
    rechnung({ nettoSumme: 100, status: "bezahlt", rechnungsdatum: "2026-09-30" }),
    rechnung({ nettoSumme: 50, status: "versendet", rechnungsdatum: "2026-09-30", faelligAm: "2026-10-14" }), // überfällig
    rechnung({ nettoSumme: 30, status: "versendet", rechnungsdatum: "2026-09-30", faelligAm: "2026-10-31" }), // offen
    rechnung({ nettoSumme: 999, status: "entwurf", rechnungsdatum: null }),
    rechnung({ nettoSumme: 999, status: "storniert", rechnungsdatum: "2026-09-30" }),
    rechnung({ nettoSumme: -999, status: "versendet", rechnungsdatum: "2026-09-30", stornoVon: "x" }),
    rechnung({ nettoSumme: 200, status: "bezahlt", rechnungsdatum: "2026-08-31" }),
  ];

  it("summiert den Monat und teilt in bezahlt, offen und überfällig", () => {
    const u = berechneUmsatz(rows, monatsFenster("2026-09"), heute);
    expect(u).toEqual({ umsatz: 180, bezahlt: 100, offen: 30, ueberfaellig: 50, anzahl: 3 });
  });

  it("Entwürfe, stornierte Rechnungen und Gutschriften zählen nicht", () => {
    expect(berechneUmsatz(rows, jahresFenster(2026), heute).umsatz).toBe(380);
  });

  it("gesamt ohne Zeitfenster", () => {
    expect(berechneUmsatz(rows, null, heute).umsatz).toBe(380);
  });

  it("Monatsgrenzen sind inklusive (30.09. gehört zum September, 31.08. zum August)", () => {
    expect(berechneUmsatz(rows, monatsFenster("2026-08"), heute).umsatz).toBe(200);
    expect(monatsFenster("2026-02")).toEqual({ von: "2026-02-01", bis: "2026-02-28" });
    expect(monatsFenster("2028-02").bis).toBe("2028-02-29");
  });

  it("überfällig erst nach dem Fälligkeitstag", () => {
    const r = [rechnung({ status: "versendet", faelligAm: "2026-10-20", nettoSumme: 10 })];
    expect(berechneUmsatz(r, null, "2026-10-20").offen).toBe(10);
    expect(berechneUmsatz(r, null, "2026-10-21").ueberfaellig).toBe(10);
  });
});

describe("Abrechnung: Vergleich und Reihen", () => {
  it("Veränderung in Prozent, ohne Vorperiode kein Wert", () => {
    expect(veraenderungProzent(150, 100)).toBe(50);
    expect(veraenderungProzent(50, 100)).toBe(-50);
    expect(veraenderungProzent(100, 0)).toBeNull();
  });

  it("verschiebt Monate über den Jahreswechsel", () => {
    expect(verschiebeMonat("2026-01", -1)).toBe("2025-12");
    expect(verschiebeMonat("2026-12", 1)).toBe("2027-01");
  });

  it("Entwürfe werden separat als erwartet geführt", () => {
    const rows = [
      rechnung({ status: "entwurf", rechnungsdatum: null, leistungszeitraumVon: "2026-10-01", nettoSumme: 213 }),
      rechnung({ status: "bezahlt", nettoSumme: 100 }),
    ];
    expect(summeEntwuerfe(rows)).toBe(213);
    const reihe = monatsReihe(rows, 2026, heute);
    expect(reihe).toHaveLength(12);
    expect(reihe[8]).toMatchObject({ monat: "2026-09", bezahlt: 100, erwartet: 0 });
    expect(reihe[9]).toMatchObject({ monat: "2026-10", bezahlt: 0, erwartet: 213 });
  });

  it("letzte Rechnungen und nächste Fälligkeiten", () => {
    const rows = [
      rechnung({ nummer: "2026-0001", rechnungsdatum: "2026-07-31", status: "bezahlt" }),
      rechnung({ nummer: "2026-0002", rechnungsdatum: "2026-08-31", status: "versendet", faelligAm: "2026-09-14" }),
      rechnung({ nummer: "2026-0003", rechnungsdatum: "2026-09-30", status: "versendet", faelligAm: "2026-10-14" }),
      rechnung({ nummer: "E", rechnungsdatum: null, status: "entwurf" }),
    ];
    expect(letzteRechnungen(rows, 2).map((r) => r.nummer)).toEqual(["2026-0003", "2026-0002"]);
    expect(naechsteFaelligkeiten(rows, 5).map((r) => r.nummer)).toEqual(["2026-0002", "2026-0003"]);
  });

  it("erkennt Demo-Rechnungen an der Nummer", () => {
    expect(istDemoRechnung({ nummer: "DEMO-2026-01" })).toBe(true);
    expect(istDemoRechnung({ nummer: "2026-0001" })).toBe(false);
    expect(istDemoRechnung({ nummer: null })).toBe(false);
  });
});
