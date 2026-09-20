import { describe, expect, it } from "vitest";
import { berechneAenderungen, KIND_FELDER } from "@/lib/datenschutz/auskunft";

describe("Auskunft: Änderungsverlauf in lesbarer Form", () => {
  it("nennt nur geänderte Felder mit Vorher und Nachher", () => {
    const zeilen = berechneAenderungen(
      { vorname: "Mia", nachname: "Muster", eintritt: "2024-09-01", updated_at: "x" },
      { vorname: "Mia", nachname: "Beispiel", eintritt: "2024-09-01", updated_at: "y" },
      KIND_FELDER
    );
    expect(zeilen).toEqual([{ feld: "Nachname", vorher: "Muster", nachher: "Beispiel" }]);
  });

  it("formatiert Datumswerte und Wahrheitswerte", () => {
    const zeilen = berechneAenderungen({ austritt: null, hat_behinderung: false }, { austritt: "2027-07-31", hat_behinderung: true }, KIND_FELDER);
    expect(zeilen).toContainEqual({ feld: "Austritt", vorher: "–", nachher: "31.07.2027" });
    expect(zeilen).toContainEqual({ feld: "I-Status", vorher: "Nein", nachher: "Ja" });
  });

  it("löst Gruppe und Buchungszeit über die Auflösefunktion in Namen auf", () => {
    const zeilen = berechneAenderungen(
      { gruppe_id: "g1", buchungszeit_band_id: "b1" },
      { gruppe_id: "g2", buchungszeit_band_id: "b1" },
      KIND_FELDER,
      (feld, wert) => (feld === "gruppe_id" ? (wert === "g1" ? "Sonnen" : "Monde") : null)
    );
    expect(zeilen).toEqual([{ feld: "Gruppe", vorher: "Sonnen", nachher: "Monde" }]);
  });

  it("beim Anlegen erscheinen nur befüllte Felder", () => {
    const zeilen = berechneAenderungen(null, { vorname: "Mia", nachname: "Muster", notizen: null, wohnort: "" }, KIND_FELDER);
    expect(zeilen.map((z) => z.feld)).toEqual(["Vorname", "Nachname"]);
    expect(zeilen[0].vorher).toBe("–");
  });
});
