import { describe, expect, it } from "vitest";
import { abgleichen, findeBestand, nichtMehrInDatei, type BestandsZeile, type DateiZeile } from "@/lib/import/abgleich";

const felder = [
  { feld: "gruppe", label: "Gruppe" },
  { feld: "buchungszeit", label: "Buchungszeit" },
];
const bestand: BestandsZeile[] = [
  { id: "1", externeId: "K-100", quelle: "kigaroo", schluessel: "anna|meier|2022-01-01", werte: { gruppe: "Sterne", buchungszeit: "6-7h" } },
  { id: "2", externeId: null, quelle: null, schluessel: "ben|kraft|2021-05-05", werte: { gruppe: "Mond", buchungszeit: "5-6h" } },
  { id: "3", externeId: "K-300", quelle: "kigaroo", schluessel: "cem|lang|2020-03-03", werte: { gruppe: "Mond", buchungszeit: "7-8h" } },
];
const zeile = (z: Partial<DateiZeile>): DateiZeile => ({ externeId: null, schluessel: "x", werte: {}, ...z });

describe("Abgleich mit dem Bestand", () => {
  it("erkennt über die Nummer der Quelle und meldet geänderte Felder mit alt und neu", () => {
    const a = abgleichen(zeile({ externeId: "K-100", schluessel: "anna|meier|2022-01-01", werte: { gruppe: "Sterne", buchungszeit: "7-8h" } }), bestand, "kigaroo", felder);
    expect(a).toEqual({ aktion: "aktualisieren", id: "1", aenderungen: [{ feld: "buchungszeit", label: "Buchungszeit", alt: "6-7h", neu: "7-8h" }] });
  });
  it("unverändert, wenn alle Felder gleich sind", () => {
    const a = abgleichen(zeile({ externeId: "K-100", werte: { gruppe: "Sterne", buchungszeit: "6-7h" } }), bestand, "kigaroo", felder);
    expect(a.aktion).toBe("unveraendert");
  });
  it("fehlende Spalten ändern nichts", () => {
    const a = abgleichen(zeile({ externeId: "K-100", werte: { gruppe: "Mond" } }), bestand, "kigaroo", felder);
    expect(a.aenderungen.map((x) => x.feld)).toEqual(["gruppe"]);
  });
  it("übernimmt einen bisher nummernlosen Eintrag über den Namen und trägt die Nummer nach", () => {
    const a = abgleichen(zeile({ externeId: "K-200", schluessel: "ben|kraft|2021-05-05", werte: { gruppe: "Mond", buchungszeit: "5-6h" } }), bestand, "kigaroo", felder);
    expect(a.aktion).toBe("aktualisieren");
    expect(a.id).toBe("2");
    expect(a.aenderungen).toEqual([{ feld: "externe_id", label: "KigaRoo-Nummer", alt: null, neu: "K-200" }]);
  });
  it("nimmt keinen Eintrag mit fremder Nummer über den Namen weg — legt neu an", () => {
    const a = abgleichen(zeile({ externeId: "K-999", schluessel: "anna|meier|2022-01-01", werte: { gruppe: "Sterne" } }), bestand, "kigaroo", felder);
    expect(a.aktion).toBe("neu");
  });
  it("ohne Nummer in der Datei zählt der Name", () => {
    expect(findeBestand(zeile({ schluessel: "cem|lang|2020-03-03" }), bestand, "excel").treffer?.id).toBe("3");
    expect(abgleichen(zeile({ schluessel: "unbekannt" }), bestand, "excel", felder).aktion).toBe("neu");
  });
  it("meldet Einträge der Quelle, die nicht mehr in der Datei stehen", () => {
    expect(nichtMehrInDatei(bestand, new Set(["1"]), "kigaroo").map((b) => b.id)).toEqual(["3"]);
  });
});
