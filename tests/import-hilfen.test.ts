import { describe, expect, it } from "vitest";
import {
  alterInJahren,
  findeSpalten,
  normalisiere,
  normalisiereBand,
  parseDatum,
  parseJaNein,
  parseZahl,
  zeilenAusMatrix,
} from "@/lib/import/hilfen";
import { KIND_SPALTEN } from "@/lib/import/kinder";

describe("parseDatum", () => {
  it("liest deutsche und ISO-Schreibweisen", () => {
    expect(parseDatum("05.03.2022").iso).toBe("2022-03-05");
    expect(parseDatum("5.3.2022").iso).toBe("2022-03-05");
    expect(parseDatum("2022-03-05").iso).toBe("2022-03-05");
    expect(parseDatum("05/03/2022").iso).toBe("2022-03-05");
  });

  it("liest zweistellige Jahre (bis 40 = 2000er, sonst 1900er)", () => {
    expect(parseDatum("01.09.21").iso).toBe("2021-09-01");
    expect(parseDatum("01.09.85").iso).toBe("1985-09-01");
  });

  it("liest Excel-Seriennummern (44562 = 01.01.2022)", () => {
    expect(parseDatum(44562).iso).toBe("2022-01-01");
    expect(parseDatum(44927).iso).toBe("2023-01-01");
  });

  it("lehnt unmögliche Daten ab", () => {
    expect(parseDatum("31.02.2022").fehler).toMatch(/kein gültiges Datum/);
    expect(parseDatum("gestern").fehler).toMatch(/kein gültiges Datum/);
    expect(parseDatum(12).fehler).toMatch(/kein gültiges Datum/);
  });

  it("leer ist kein Fehler", () => {
    expect(parseDatum("")).toEqual({ iso: null, fehler: null });
    expect(parseDatum(null)).toEqual({ iso: null, fehler: null });
  });
});

describe("Werte", () => {
  it("parseJaNein", () => {
    expect(parseJaNein("Ja")).toBe(true);
    expect(parseJaNein("x")).toBe(true);
    expect(parseJaNein("nein")).toBe(false);
    expect(parseJaNein("")).toBe(false);
    expect(parseJaNein("vielleicht")).toBeNull();
  });

  it("parseZahl versteht Kommazahlen", () => {
    expect(parseZahl("37,5")).toBe(37.5);
    expect(parseZahl(39)).toBe(39);
    expect(parseZahl("abc")).toBeNull();
    expect(parseZahl("")).toBeNull();
  });

  it("normalisiere entfernt Umlaute, Akzente und Satzzeichen", () => {
    expect(normalisiere("  Nachrücker/in ")).toBe("nachruecker in");
    expect(normalisiere("Mädchen")).toBe("maedchen");
  });

  it("normalisiereBand vereinheitlicht Schreibweisen", () => {
    expect(normalisiereBand("6 bis 7 Std.")).toBe(normalisiereBand("6-7h"));
    expect(normalisiereBand("35,5–40")).toBe(normalisiereBand("35,5h-40h"));
    expect(normalisiereBand("> 9h")).toBe(normalisiereBand("über 9h"));
    expect(normalisiereBand("25 Stunden")).toBe(normalisiereBand("25h"));
  });

  it("alterInJahren berücksichtigt den Geburtstag", () => {
    expect(alterInJahren("2020-09-20", "2026-09-19")).toBe(5);
    expect(alterInJahren("2020-09-20", "2026-09-20")).toBe(6);
  });
});

describe("Kopfzeile und Spalten", () => {
  it("ordnet Überschriften über Synonyme zu", () => {
    const spalten = findeSpalten(["Rufname", "Familienname", "Geb.-Datum", "Zeitk.", "I-Kind"], KIND_SPALTEN);
    expect(spalten.vorname).toBe("Rufname");
    expect(spalten.nachname).toBe("Familienname");
    expect(spalten.geburtsdatum).toBe("Geb.-Datum");
    expect(spalten.buchungszeit).toBe("Zeitk.");
    expect(spalten.istatus).toBe("I-Kind");
    expect(spalten.gruppe).toBeNull();
  });

  it("findet die Kopfzeile unter Titelzeilen und überspringt leere Zeilen", () => {
    const { zeilen, kopfzeile } = zeilenAusMatrix(
      [
        ["Personalbelegungsliste 2026/27"],
        [],
        ["Vorname", "Nachname", "Geburtsdatum", "Geschlecht"],
        ["Mia", "Muster", "01.02.2022", "w"],
        [null, null, null, null],
        ["Ben", "Beispiel", "03.04.2021", "m"],
      ],
      KIND_SPALTEN
    );
    expect(kopfzeile).toBe(3);
    expect(zeilen).toHaveLength(2);
    expect(zeilen[1]).toMatchObject({ Vorname: "Ben", Nachname: "Beispiel" });
  });
});
