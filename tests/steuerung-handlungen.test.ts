import { describe, expect, it } from "vitest";
import { baueHandlungen, type HandlungsEingabe, type GruppenVerlauf } from "@/lib/steuerung/handlungen";

const leer: HandlungsEingabe = {
  stichtag: "2026-10-04",
  ausblick: { satz: { ton: "ok", text: "ok" }, ersterEngpass: null, ersteWarnung: null, ursache: null, verursacher: [] },
  verursacherIds: {},
  gruppen: [],
  freiwerdende: [],
  kinderOhneBuchungszeit: [],
  langzeit: [],
  verguetungFehlt: null,
  foerderbetragFehlt: null,
};

const monat = (m: string, ampel: "gruen" | "gelb" | "rot", ist = 80, soll = 80, belegt = 20, sollplaetze = 20) => ({
  monat: m,
  ampel,
  istStunden: ist,
  sollStunden: soll,
  belegt,
  sollplaetze,
});

function gruppe(partial: Partial<GruppenVerlauf>): GruppenVerlauf {
  return { gruppeId: "g1", name: "Sterne", belastbar: true, modell: "bw", monate: [monat("2026-10-01", "gruen")], ...partial };
}

describe("baueHandlungen", () => {
  it("ohne Auffälligkeiten ist die Liste leer", () => {
    expect(baueHandlungen({ ...leer, gruppen: [gruppe({})] })).toEqual([]);
  });

  it("Personal-Engpass der Einrichtung verweist bei genau einem Verursacher auf die Person", () => {
    const liste = baueHandlungen({
      ...leer,
      ausblick: {
        satz: { ton: "engpass", text: "Ab April 2027 fehlen dir rund 20 Wochenstunden Personal." },
        ersterEngpass: { monat: "2027-04-01", ampel: "rot", istStunden: 172, bedarfStunden: 192, fehlendeStunden: 20, kinder: 36, detail: "" },
        ersteWarnung: null,
        ursache: "Julia Vogt scheidet aus (30 Wochenstunden weniger).",
        verursacher: [{ name: "Julia Vogt", austritt: "2027-03-31", wochenstunden: 30 }],
      },
      verursacherIds: { "Julia Vogt": "p-1" },
    });
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ ton: "warn", href: "/team/p-1", wann: "2027-04-01" });
  });

  it("Gruppe mit künftigem Personal-Engpass: Warnung mit Ist/Soll und Link auf die Gruppe", () => {
    const liste = baueHandlungen({
      ...leer,
      gruppen: [gruppe({ monate: [monat("2026-10-01", "gruen"), monat("2027-01-01", "rot", 60, 92)] })],
    });
    expect(liste[0]).toMatchObject({ ton: "warn", href: "/gruppen/g1", wann: "2027-01-01" });
    expect(liste[0].titel).toBe("Sterne: Ab Januar 2027 fehlt Personal");
    expect(liste[0].grund).toContain("fehlen rund 32");
  });

  it("Bayern-Gruppenwert ist nur ein Hinweis, keine Warnung", () => {
    const liste = baueHandlungen({
      ...leer,
      gruppen: [gruppe({ modell: "bayern", monate: [monat("2026-10-01", "rot", 40, 80)] })],
    });
    expect(liste[0].ton).toBe("info");
  });

  it("nicht belastbare Gruppenwerte (Personal ohne Gruppe) erzeugen keine Personal-Aufgabe", () => {
    const liste = baueHandlungen({
      ...leer,
      gruppen: [gruppe({ belastbar: false, monate: [monat("2026-10-01", "rot", 0, 80)] })],
    });
    expect(liste).toEqual([]);
  });

  it("Überbelegung wird je Gruppe gemeldet", () => {
    const liste = baueHandlungen({ ...leer, gruppen: [gruppe({ monate: [monat("2026-10-01", "gruen", 80, 80, 22, 20)] })] });
    expect(liste[0]).toMatchObject({ bereich: "Belegung", ton: "warn", href: "/gruppen/g1" });
    expect(liste[0].grund).toBe("22 Kinder bei 20 Plätzen");
  });

  it("frei werdender Platz ohne Nachfolger → Aufgabe, mit festem Nachfolger → keine", () => {
    const platz = {
      monat: "2026-12-01",
      gruppeId: "g1",
      gruppeName: "Sterne",
      anzahl: 1,
      abgaenge: [{ name: "Zoe Baumgart", austritt: "2026-12-31" }],
      bereitsEingeplant: [] as { kindId: string; name: string; eintritt: string }[],
      vorschlaege: [],
    };
    const offen = baueHandlungen({ ...leer, freiwerdende: [platz] });
    expect(offen).toHaveLength(1);
    expect(offen[0].grund).toContain("kein Nachrücker vorgemerkt");
    const versorgt = baueHandlungen({
      ...leer,
      freiwerdende: [{ ...platz, bereitsEingeplant: [{ kindId: "k2", name: "Mia Lenz", eintritt: "2027-01-01" }] }],
    });
    expect(versorgt).toEqual([]);
  });

  it("viele Austritte werden gekürzt: drei Namen plus Rest", () => {
    const abgaenge = Array.from({ length: 6 }, (_, i) => ({ name: `Kind ${i}`, austritt: "2027-08-31" }));
    const liste = baueHandlungen({
      ...leer,
      freiwerdende: [{ monat: "2027-09-01", gruppeId: "g1", gruppeName: "Sterne", anzahl: 6, abgaenge, bereitsEingeplant: [], vorschlaege: [] }],
    });
    expect(liste[0].grund).toContain("+ 3 weitere");
    expect(liste[0].grund).not.toContain("Kind 5");
  });

  it("Kinder ohne Buchungszeit: höchstens drei namentlich, der Rest als Sammelaufgabe", () => {
    const kinder = Array.from({ length: 5 }, (_, i) => ({ id: `k${i}`, name: `Kind ${i}` }));
    const liste = baueHandlungen({ ...leer, kinderOhneBuchungszeit: kinder });
    expect(liste).toHaveLength(4);
    expect(liste.filter((h) => h.href.startsWith("/kinder/"))).toHaveLength(3);
    expect(liste.find((h) => h.id === "ohne-buchungszeit-rest")?.titel).toBe("2 weitere Kinder ohne Buchungszeit");
  });

  it("Vergütungs-Aufgaben nur mit Finanzen-Recht (verguetungFehlt !== null)", () => {
    expect(baueHandlungen({ ...leer, verguetungFehlt: null })).toEqual([]);
    const mit = baueHandlungen({ ...leer, verguetungFehlt: [{ id: "p1", name: "Anna Kellner" }] });
    expect(mit[0]).toMatchObject({ href: "/team/p1", titel: "Anna Kellner: Vergütung fehlt" });
  });

  it("sortiert Warnungen vor Hinweisen und dann nach Termin", () => {
    const liste = baueHandlungen({
      ...leer,
      langzeit: [{ teamId: "p9", name: "Sarah Lang", art: "schwangerschaft", von: "2026-07-22", bis: null, artLabel: "Schwangerschaft" }],
      gruppen: [gruppe({ monate: [monat("2027-02-01", "rot", 10, 80)] }), gruppe({ gruppeId: "g2", name: "Monde", monate: [monat("2026-11-01", "rot", 10, 80)] })],
    });
    expect(liste.map((h) => h.id)).toEqual(["personal-gruppe-g2", "personal-gruppe-g1", "ausfall-p9-2026-07-22"]);
    expect(liste[2].titel).toBe("Sarah Lang: Schwangerschaft");
  });
});
