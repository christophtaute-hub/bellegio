import { describe, expect, it } from "vitest";
import { pruefeKinderImport, type KindImportKontext } from "@/lib/import/kinder";

const kontext: KindImportKontext = {
  bundeslandCode: "by",
  gruppen: [
    { id: "g-kiga", name: "Pinguine" },
    { id: "g-krippe", name: "Mäuse" },
  ],
  baender: [
    { id: "b-67", label: "6-7h" },
    { id: "b-9", label: "über 9h" },
  ],
  gewichtungen: [
    { id: "f-u3", code: "u3", label: "Kinder unter drei Jahren" },
    { id: "f-ue3", code: "ue3_bis_schuleintritt", label: "Kinder von drei Jahren bis Schuleintritt" },
    { id: "f-schul", code: "schulkinder", label: "Schulkinder" },
    { id: "f-int", code: "integrationskinder", label: "Integrationskinder" },
    { id: "f-mig", code: "nicht_deutschsprachig", label: "Eltern beide nichtdeutschsprachiger Herkunft" },
  ],
  vorhandene: [{ vorname: "Emil", nachname: "Alt", geburtsdatum: "2021-01-01" }],
  heute: "2026-09-20",
};

const basis = {
  Vorname: "Mia",
  Nachname: "Muster",
  Geburtsdatum: "01.02.2024",
  Geschlecht: "w",
  Gruppe: "Mäuse",
  Eintritt: "01.09.2025",
  Buchungszeit: "6 bis 7 Std.",
};

describe("Kinder-Import", () => {
  it("übernimmt eine vollständige Zeile und leitet Status und Gewichtung ab", () => {
    const erg = pruefeKinderImport([basis], kontext);
    const z = erg.zeilen[0];
    expect(z.kind).toMatchObject({
      vorname: "Mia",
      geburtsdatum: "2024-02-01",
      geschlecht: "weiblich",
      status: "aktiv",
      gruppe_id: "g-krippe",
      buchungszeit_band_id: "b-67",
      eintritt: "2025-09-01",
      weighting_factor_ids: ["f-u3"],
    });
    // Mia ist mit 2 Jahren U3 — die abgeleitete Gewichtung wird ausdrücklich gemeldet.
    expect(z.status).toBe("warnung");
    expect(z.meldungen.join(" ")).toContain("Gewichtung aus dem Alter abgeleitet");
  });

  it("nimmt eine ausdrücklich angegebene Gewichtung statt der Ableitung", () => {
    const erg = pruefeKinderImport([{ ...basis, Gewichtung: "Ü3, Migration" }], kontext);
    expect(erg.zeilen[0].kind?.weighting_factor_ids).toEqual(["f-ue3", "f-mig"]);
  });

  it("ergänzt bei I-Status in Bayern den Integrationsfaktor", () => {
    const erg = pruefeKinderImport([{ ...basis, "I-Status": "ja" }], kontext);
    expect(erg.zeilen[0].kind?.hat_behinderung).toBe(true);
    expect(erg.zeilen[0].kind?.weighting_factor_ids).toContain("f-int");
  });

  it("lehnt fehlendes Geschlecht ab", () => {
    const erg = pruefeKinderImport([{ ...basis, Geschlecht: "" }], kontext);
    expect(erg.zeilen[0].status).toBe("fehler");
    expect(erg.zeilen[0].meldungen.join(" ")).toContain("Geschlecht fehlt");
  });

  it("verlangt für aktive Kinder Eintritt und Gruppe", () => {
    const ohneEintritt = pruefeKinderImport([{ ...basis, Eintritt: "" }], kontext).zeilen[0];
    expect(ohneEintritt.status).toBe("fehler");
    expect(ohneEintritt.meldungen.join(" ")).toContain("Eintrittsdatum");

    const ohneGruppe = pruefeKinderImport([{ ...basis, Gruppe: "", Status: "aktiv" }], kontext).zeilen[0];
    expect(ohneGruppe.status).toBe("fehler");
    expect(ohneGruppe.meldungen.join(" ")).toContain("brauchen eine Gruppe");
  });

  it("macht Kinder mit Eintritt in der Zukunft ohne Statusangabe zu Nachrückern", () => {
    const erg = pruefeKinderImport([{ ...basis, Gruppe: "", Eintritt: "01.01.2027" }], kontext);
    expect(erg.zeilen[0].kind?.status).toBe("nachruecker");
    expect(erg.zeilen[0].kind?.gruppe_id).toBeNull();
  });

  it("verlangt für Nachrücker ein Eintrittsdatum", () => {
    const erg = pruefeKinderImport([{ ...basis, Status: "Nachrücker", Eintritt: "" }], kontext);
    expect(erg.zeilen[0].status).toBe("fehler");
    expect(erg.zeilen[0].meldungen.join(" ")).toContain("geplantes Eintrittsdatum");
  });

  it("meldet unbekannte Gruppen mit den vorhandenen Namen", () => {
    const erg = pruefeKinderImport([{ ...basis, Gruppe: "Delfine" }], kontext);
    expect(erg.zeilen[0].status).toBe("fehler");
    expect(erg.zeilen[0].meldungen.join(" ")).toContain("Pinguine, Mäuse");
  });

  it("erkennt Gruppennamen ohne Rücksicht auf Groß-/Kleinschreibung und Umlaute", () => {
    const erg = pruefeKinderImport([{ ...basis, Gruppe: "maeuse" }], kontext);
    expect(erg.zeilen[0].kind?.gruppe_id).toBe("g-krippe");
  });

  it("lehnt eine unbekannte Buchungszeit ab, warnt bei fehlender", () => {
    const unbekannt = pruefeKinderImport([{ ...basis, Buchungszeit: "13-14h" }], kontext).zeilen[0];
    expect(unbekannt.status).toBe("fehler");
    const fehlt = pruefeKinderImport([{ ...basis, Buchungszeit: "", Gewichtung: "U3" }], kontext).zeilen[0];
    expect(fehlt.status).toBe("warnung");
    expect(fehlt.meldungen.join(" ")).toContain("Keine Buchungszeit");
  });

  it("prüft das Geburtsdatum auf Zukunft und Plausibilität", () => {
    expect(pruefeKinderImport([{ ...basis, Geburtsdatum: "01.01.2030" }], kontext).zeilen[0].meldungen.join(" ")).toContain("Zukunft");
    expect(pruefeKinderImport([{ ...basis, Geburtsdatum: "01.01.1990" }], kontext).zeilen[0].meldungen.join(" ")).toContain("bitte prüfen");
  });

  it("erkennt Dubletten gegen den Bestand und innerhalb der Datei", () => {
    const erg = pruefeKinderImport(
      [
        { ...basis, Vorname: "Emil", Nachname: "Alt", Geburtsdatum: "01.01.2021" },
        basis,
        basis,
      ],
      kontext
    );
    expect(erg.zeilen.map((z) => z.status)).toEqual(["duplikat", "warnung", "duplikat"]);
    expect(erg.uebernehmbar).toBe(1);
    expect(erg.duplikate).toBe(2);
  });

  it("meldet fehlende Pflichtspalten und prüft dann keine Zeilen", () => {
    const erg = pruefeKinderImport([{ Vorname: "Mia", Nachname: "Muster" }], kontext);
    expect(erg.fehlendeSpalten).toEqual(["Geburtsdatum", "Geschlecht"]);
    expect(erg.zeilen).toEqual([]);
  });

  it("nutzt in Baden-Württemberg keine Gewichtung", () => {
    const erg = pruefeKinderImport([basis], { ...kontext, bundeslandCode: "bw" });
    expect(erg.zeilen[0].kind?.weighting_factor_ids).toEqual([]);
    expect(erg.zeilen[0].status).toBe("ok");
  });

  it("liest Excel-Datumswerte als Seriennummern", () => {
    const erg = pruefeKinderImport([{ ...basis, Geburtsdatum: 45323, Eintritt: 45901 }], kontext);
    expect(erg.zeilen[0].kind?.geburtsdatum).toBe("2024-02-01");
    expect(erg.zeilen[0].kind?.eintritt).toBe("2025-09-01");
  });
});
