import { describe, expect, it } from "vitest";
import {
  berechneBelegungsVorschau,
  type VorschauGruppe,
  type VorschauKind,
} from "@/lib/belegung/vorschau";

const gruppe: VorschauGruppe = { id: "g1", name: "Sonnengruppe", gruppenart: "kindergarten", sollplatze: 2 };

function kind(partial: Partial<VorschauKind> & { id: string }): VorschauKind {
  return {
    vorname: "Kind",
    nachname: partial.id.toUpperCase(),
    geburtsdatum: "2022-05-01",
    geschlecht: "weiblich",
    status: "aktiv",
    gruppeId: "g1",
    eintritt: "2025-09-01",
    austritt: null,
    wohnort: null,
    ...partial,
  };
}

const start = "2027-01-01";

describe("Belegungs-Vorschau", () => {
  it("meldet einen frei werdenden Platz, wenn eine volle Gruppe ein Kind verliert", () => {
    const kinder = [kind({ id: "a" }), kind({ id: "b", austritt: "2027-03-31" })];
    const { zeilen, freiwerdende } = berechneBelegungsVorschau([gruppe], kinder, start, 6);

    expect(zeilen[0].zellen.map((z) => z.frei)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(freiwerdende).toHaveLength(1);
    expect(freiwerdende[0].monat).toBe("2027-04-01");
    expect(freiwerdende[0].anzahl).toBe(1);
    expect(freiwerdende[0].abgaenge[0].austritt).toBe("2027-03-31");
  });

  it("meldet nichts, wenn die Gruppe vorher ohnehin nicht voll war", () => {
    const kinder = [kind({ id: "a" }), kind({ id: "b", austritt: "2027-03-31" })];
    const { freiwerdende } = berechneBelegungsVorschau([{ ...gruppe, sollplatze: 3 }], kinder, start, 6);
    expect(freiwerdende).toEqual([]);
  });

  it("zeigt einen bereits eingeplanten Nachrücker und schlägt dann niemanden mehr vor", () => {
    const kinder = [
      kind({ id: "a" }),
      kind({ id: "b", austritt: "2027-03-31" }),
      kind({ id: "n", status: "nachruecker", eintritt: "2027-04-01" }),
      kind({ id: "m", status: "nachruecker", gruppeId: null, eintritt: "2027-09-01" }),
    ];
    const { freiwerdende } = berechneBelegungsVorschau([gruppe], kinder, start, 6);
    expect(freiwerdende).toHaveLength(1);
    expect(freiwerdende[0].bereitsEingeplant.map((k) => k.kindId)).toEqual(["n"]);
    expect(freiwerdende[0].vorschlaege).toEqual([]);
  });

  it("zählt Nachrücker nicht als belegt", () => {
    const kinder = [kind({ id: "a" }), kind({ id: "n", status: "nachruecker", eintritt: "2027-02-01" })];
    const { zeilen } = berechneBelegungsVorschau([gruppe], kinder, start, 3);
    expect(zeilen[0].zellen.map((z) => z.belegt)).toEqual([1, 1, 1]);
    expect(zeilen[0].zellen.map((z) => z.nachrueckerGeplant)).toEqual([0, 1, 1]);
  });

  it("Kinder mit Eintritt in der Zukunft belegen erst ab ihrem Eintrittsmonat", () => {
    const kinder = [kind({ id: "a", eintritt: "2027-03-01" })];
    const { zeilen } = berechneBelegungsVorschau([gruppe], kinder, start, 4);
    expect(zeilen[0].zellen.map((z) => z.belegt)).toEqual([0, 0, 1, 1]);
  });
});
