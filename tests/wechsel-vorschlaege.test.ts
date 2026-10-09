import { describe, expect, it } from "vitest";
import { berechneBelegungsVorschau, type VorschauGruppe, type VorschauKind } from "@/lib/belegung/vorschau";
import { berechneWechselVorschlaege, fruehesterWechselTermin } from "@/lib/belegung/wechsel-vorschlaege";

const krippe: VorschauGruppe = { id: "kr", name: "Krippe", gruppenart: "krippe", sollplatze: 3 };
const kiga: VorschauGruppe = { id: "kg", name: "Kindergarten", gruppenart: "kindergarten", sollplatze: 2 };

function kind(partial: Partial<VorschauKind> & { id: string }): VorschauKind {
  return {
    vorname: "Kind",
    nachname: partial.id.toUpperCase(),
    geburtsdatum: "2024-05-15",
    geschlecht: "weiblich",
    status: "aktiv",
    gruppeId: "kr",
    eintritt: "2025-09-01",
    austritt: null,
    wohnort: null,
    ...partial,
  };
}

const start = "2027-01-01";

function lauf(kinder: VorschauKind[], geplant: { kindId: string; nachGruppeId: string; abDatum: string }[] = []) {
  const gruppen = [krippe, kiga];
  const { zeilen, freiwerdende } = berechneBelegungsVorschau(gruppen, kinder, start, 14);
  return berechneWechselVorschlaege({ gruppen, kinder, zeilen, freiwerdende, geplanteWechsel: geplant });
}

describe("fruehesterWechselTermin", () => {
  it("Monatserster nach dem 3. Geburtstag, bei Geburtstag am Monatsersten genau dieser Tag", () => {
    expect(fruehesterWechselTermin("2024-05-15")).toBe("2027-06-01");
    expect(fruehesterWechselTermin("2024-05-01")).toBe("2027-05-01");
    expect(fruehesterWechselTermin("2024-12-20")).toBe("2028-01-01");
  });
});

describe("berechneWechselVorschlaege", () => {
  it("schlägt den Wechsel zum frühesten Termin mit freiem Kindergartenplatz vor", () => {
    // Kind wird am 15.05.2027 drei; im Kindergarten ist ein Platz frei, weil ein Kind zum 01.07.2027 geht
    const kinder = [
      kind({ id: "a", geburtsdatum: "2024-05-15", austritt: "2027-08-31" }),
      kind({ id: "k1", gruppeId: "kg", geburtsdatum: "2021-03-01", austritt: "2027-07-01" }),
      kind({ id: "k2", gruppeId: "kg", geburtsdatum: "2021-02-01", austritt: "2027-08-31" }),
    ];
    const { vorschlaege, ohnePlatz } = lauf(kinder);
    expect(ohnePlatz).toEqual([]);
    expect(vorschlaege).toHaveLength(1);
    expect(vorschlaege[0]).toMatchObject({ kindId: "a", nachGruppeId: "kg", abDatum: "2027-07-01" });
    expect(vorschlaege[0].ersetztKind).toMatchObject({ kindId: "k1" });
    expect(vorschlaege[0].neuerAustritt).toBe("2030-08-31");
  });

  it("zwei Kinder, ein Platz: das ältere bekommt den Platz, das jüngere wartet auf den nächsten", () => {
    const kinder = [
      kind({ id: "a", geburtsdatum: "2024-05-15", austritt: "2027-08-31" }),
      kind({ id: "b", geburtsdatum: "2024-06-15", austritt: "2027-08-31" }),
      kind({ id: "k1", gruppeId: "kg", geburtsdatum: "2021-03-01", austritt: "2027-07-01" }),
      kind({ id: "k2", gruppeId: "kg", geburtsdatum: "2021-02-01" }),
    ];
    const { vorschlaege, ohnePlatz } = lauf(kinder);
    expect(vorschlaege.map((v) => v.kindId)).toEqual(["a"]);
    expect(ohnePlatz.map((o) => o.kindId)).toEqual(["b"]);
  });

  it("derselbe Abgang wird nicht für zwei Wechsel als „ersetzt“ genannt", () => {
    const kinder = [
      kind({ id: "a", geburtsdatum: "2024-05-15", austritt: "2027-08-31" }),
      kind({ id: "b", geburtsdatum: "2024-06-15", austritt: "2027-08-31" }),
      kind({ id: "k1", gruppeId: "kg", austritt: "2027-07-01" }),
      kind({ id: "k2", gruppeId: "kg", austritt: "2027-07-01" }),
    ];
    const { vorschlaege } = lauf(kinder);
    expect(vorschlaege).toHaveLength(2);
    expect(new Set(vorschlaege.map((v) => v.ersetztKind?.kindId)).size).toBe(2);
  });

  it("kein freier Platz bis zum Krippen-Austritt → Kind steht in 'ohne Platz'", () => {
    const kinder = [
      kind({ id: "a", geburtsdatum: "2024-05-15", austritt: "2027-08-31" }),
      kind({ id: "k1", gruppeId: "kg" }),
      kind({ id: "k2", gruppeId: "kg" }),
    ];
    const { vorschlaege, ohnePlatz } = lauf(kinder);
    expect(vorschlaege).toEqual([]);
    expect(ohnePlatz[0]).toMatchObject({ kindId: "a", fruehesterTermin: "2027-06-01", austritt: "2027-08-31" });
  });

  it("ein bereits geplanter Wechsel belegt den Zielplatz und bekommt keinen weiteren Vorschlag", () => {
    const kinder = [
      kind({ id: "a", geburtsdatum: "2024-05-15", austritt: "2027-08-31" }),
      kind({ id: "b", geburtsdatum: "2024-06-15", austritt: "2027-08-31" }),
      kind({ id: "k1", gruppeId: "kg", geburtsdatum: "2021-03-01", austritt: "2027-07-01" }),
      kind({ id: "k2", gruppeId: "kg", geburtsdatum: "2021-02-01" }),
    ];
    const { vorschlaege } = lauf(kinder, [{ kindId: "a", nachGruppeId: "kg", abDatum: "2027-07-01" }]);
    expect(vorschlaege.map((v) => v.kindId)).not.toContain("a");
    expect(vorschlaege.map((v) => v.kindId)).not.toContain("b");
  });

  it("zu junge Kinder (3. Geburtstag nach dem Vorschauzeitraum) bekommen keinen Vorschlag", () => {
    const kinder = [kind({ id: "a", geburtsdatum: "2025-06-01" }), kind({ id: "k1", gruppeId: "kg", austritt: "2027-03-01" })];
    expect(lauf(kinder)).toEqual({ vorschlaege: [], ohnePlatz: [] });
  });
});
