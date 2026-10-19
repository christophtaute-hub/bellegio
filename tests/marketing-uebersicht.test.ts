import { describe, expect, it } from "vitest";
import { baueZeilen, ermittleHinweise, filtereZeilen, kennzahlen, type BewertungDaten, type EinrichtungStamm } from "@/lib/marketing/uebersicht";
import type { Kampagne } from "@/lib/marketing/kampagne";

const heute = "2026-10-19";
const e = (id: string, name: string, extra: Partial<EinrichtungStamm> = {}): EinrichtungStamm => ({ id, name, kostenstelle: `K-${id}`, cluster: "A", bundeslandCode: "by", ort: "München", ...extra });
const b = (id: string, st: Partial<BewertungDaten["stufen"]>, extra: Partial<BewertungDaten> = {}): BewertungDaten => ({
  einrichtungId: id,
  regionalleitungUserId: null,
  stufen: { personalbedarf: 0, personelle_qualitaet: 0, paedagogische_qualitaet: 0, belegung: 0, ...st },
  bewertetAm: "2026-10-15T10:00:00Z",
  ...extra,
});
const k = (id: string, einrichtungId: string, extra: Partial<Kampagne> = {}): Kampagne => ({
  id, einrichtungId, art: "belegung", kanal: "meta", beworbenes: "6 Plätze", anzahl: 6, beginn: "2026-10-01", ende: "2026-12-31", status: "aktiv",
  budget: 500, kosten: 100, links: [], verantwortlichUserId: null, kommentar: null, naechsterSchritt: null, schrittFaellig: null, ...extra,
});
const nutzer = new Map([["u1", "Katrin K."]]);

describe("Marketing-Übersicht", () => {
  const einr = [e("1", "Alpha"), e("2", "Beta", { cluster: "B", bundeslandCode: "nrw" }), e("3", "Gamma")];
  const bew = [b("1", { belegung: 3 }), b("2", { personalbedarf: 2 }, { regionalleitungUserId: "u1" }), b("3", {}, { bewertetAm: "2026-08-01T00:00:00Z" })];
  const kamp = [k("k1", "2", { art: "personal", ende: "2026-10-22" })];
  const zeilen = baueZeilen(einr, bew, kamp, nutzer);
  const hinweise = ermittleHinweise(zeilen, heute);

  it("sortiert die schlimmste Einrichtung zuerst", () => {
    expect(zeilen.map((z) => z.einrichtung.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(zeilen[1].regionalleitung).toBe("Katrin K.");
  });
  it("kritisch ohne Maßnahme (Alpha: Belegung Rot, keine Kampagne)", () => {
    expect(hinweise.find((h) => h.art === "ohne_massnahme")).toMatchObject({ einrichtungName: "Alpha", schwere: 3, text: "Belegung Rot — keine Kampagne hinterlegt" });
  });
  it("kritisch mit laufender Kampagne ist nur „wichtig“ (Beta: Personalbedarf Orange)", () => {
    expect(hinweise.find((h) => h.art === "kritisch")).toMatchObject({ einrichtungName: "Beta", schwere: 2, text: "Personalbedarf Orange — Kampagne läuft bzw. ist geplant" });
    expect(hinweise.filter((h) => h.art === "ohne_massnahme" && h.einrichtungName === "Beta")).toHaveLength(0);
  });
  it("Kampagne endet in 3 Tagen", () => {
    expect(hinweise.find((h) => h.art === "endet_bald")?.text).toBe("Kampagne „6 Plätze“ endet in 3 Tagen");
  });
  it("Bewertung veraltet (Gamma: 79 Tage)", () => {
    expect(hinweise.find((h) => h.art === "veraltet")?.text).toBe("Bewertung seit 79 Tagen nicht aktualisiert");
  });
  it("nie bewertet", () => {
    const z = baueZeilen([e("9", "Neu")], [], [], nutzer);
    expect(ermittleHinweise(z, heute).map((h) => h.text)).toEqual(["Noch nie bewertet"]);
  });
  it("überfällige Kampagne ist dringend", () => {
    const z = baueZeilen([e("1", "Alpha")], [b("1", {})], [k("k2", "1", { ende: "2026-10-01" })], nutzer);
    expect(ermittleHinweise(z, heute).find((h) => h.art === "ueberfaellig")).toMatchObject({ schwere: 3 });
  });
  it("Hinweise: dringend zuerst", () => {
    expect(hinweise[0].schwere).toBe(3);
    expect(hinweise.map((h) => h.schwere)).toEqual([...hinweise.map((h) => h.schwere)].sort((a, c) => c - a));
  });
  it("Filter: Bundesland, Cluster, Regionalleitung, Suche, Farbe, Kampagne, Kennzahl-Fokus", () => {
    expect(filtereZeilen(zeilen, { bundesland: "nrw" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["2"]);
    expect(filtereZeilen(zeilen, { cluster: "A" }, hinweise)).toHaveLength(2);
    expect(filtereZeilen(zeilen, { regionalleitung: "u1" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["2"]);
    expect(filtereZeilen(zeilen, { q: "gam" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["3"]);
    expect(filtereZeilen(zeilen, { farbe: "rot" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["1"]);
    expect(filtereZeilen(zeilen, { kampagne: "aktiv" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["2"]);
    expect(filtereZeilen(zeilen, { fokus: "ohne_massnahme" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["1"]);
    expect(filtereZeilen(zeilen, { fokus: "veraltet" }, hinweise).map((z) => z.einrichtung.id)).toEqual(["3"]);
    expect(filtereZeilen(zeilen, { fokus: "kritisch" }, hinweise)).toHaveLength(2);
  });
  it("Kennzahlen", () => {
    expect(kennzahlen(zeilen, hinweise)).toEqual({ kritisch: 2, laufendeKampagnen: 1, ohneMassnahme: 1, veraltet: 1 });
  });
});
