import { describe, expect, it } from "vitest";
import { pruefeKinderImport, type KindImportKontext } from "@/lib/import/kinder";
import { ergaenzeKinderAbgleich, type KindBestand } from "@/lib/import/abgleich-kinder";

const kontext: KindImportKontext = {
  bundeslandCode: "bw",
  gruppen: [{ id: "g1", name: "Sterne" }, { id: "g2", name: "Mond" }],
  baender: [{ id: "b1", label: "25,5-30h" }, { id: "b2", label: "30,5-35h" }],
  gewichtungen: [],
  vorhandene: [{ vorname: "Anna", nachname: "Meier", geburtsdatum: "2022-01-01" }],
  heute: "2026-10-09",
  abgleich: true,
};
const bestand: KindBestand[] = [
  { id: "k1", vorname: "Anna", nachname: "Meier", geburtsdatum: "2022-01-01", externe_id: "K-1", datenquelle: "kigaroo", gruppe_id: "g1", status: "aktiv", eintritt: "2024-09-01", austritt: null, vertrag_gueltig_bis: null, buchungszeit_band_id: "b1", wohnort: "Köln", hat_behinderung: false },
  { id: "k2", vorname: "Ben", nachname: "Kraft", geburtsdatum: "2021-02-02", externe_id: "K-2", datenquelle: "kigaroo", gruppe_id: "g2", status: "aktiv", eintritt: "2024-09-01", austritt: null, vertrag_gueltig_bis: null, buchungszeit_band_id: "b2", wohnort: null, hat_behinderung: false },
];
const zeilen = [
  { "Kinder-Nr.": "K-1", Vorname: "Anna", Nachname: "Meier", Geburtsdatum: "01.01.2022", Geschlecht: "w", Gruppe: "Sterne", Eintritt: "01.09.2024", Buchungszeit: "30,5-35h" },
  { "Kinder-Nr.": "K-9", Vorname: "Cem", Nachname: "Lang", Geburtsdatum: "03.03.2020", Geschlecht: "m", Gruppe: "Mond", Eintritt: "01.09.2024", Buchungszeit: "25,5-30h" },
];

describe("Abgleich von Kindern", () => {
  const ergebnis = ergaenzeKinderAbgleich(pruefeKinderImport(zeilen, kontext), bestand, "kigaroo", kontext);
  it("im Abgleichmodus sind vorhandene Kinder keine Dubletten", () => {
    expect(ergebnis.duplikate).toBe(0);
    expect(ergebnis.zeilen[0].status).not.toBe("duplikat");
  });
  it("meldet die Änderung der Buchungszeit mit alt und neu und legt das neue Kind an", () => {
    expect(ergebnis.zeilen[0].abgleich).toMatchObject({ aktion: "aktualisieren", id: "k1", aenderungen: [{ label: "Buchungszeit", alt: "25,5-30h", neu: "30,5-35h" }] });
    expect(ergebnis.zeilen[1].abgleich?.aktion).toBe("neu");
    expect(ergebnis.abgleich).toMatchObject({ neu: 1, aktualisieren: 1, unveraendert: 0 });
  });
  it("Wohnort steht nicht in der Datei: bleibt unverändert; Kinder der Quelle ohne Zeile werden gemeldet", () => {
    expect(ergebnis.zeilen[0].abgleich?.aenderungen.some((a) => a.label === "Wohnort")).toBe(false);
    expect(ergebnis.abgleich?.nichtMehrInDatei).toEqual(["Ben Kraft"]);
  });
});
