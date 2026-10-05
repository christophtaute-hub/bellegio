import { describe, expect, it } from "vitest";
import { berechneGruppenStatus, ersterKritischerMonat, type GruppeEingabe } from "@/lib/steuerung/gruppen-status";
import type { PersonalplanungKontext } from "@/lib/team/personalplanung";
import type { TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import type { PresenceRow } from "@/lib/dashboard/presence";

function gruppe(partial: Partial<GruppeEingabe> & { id: string }): GruppeEingabe {
  return {
    name: partial.id,
    gruppenart: "kindergarten",
    sollplatze: 20,
    bw_betriebsform: null,
    bw_altersmischung: false,
    bw_oeffnungszeit_stunden: null,
    bw_randzeit_stunden: null,
    nrw_gruppenform: null,
    nrw_buchungszeit_stunden: null,
    ...partial,
  };
}

function person(gruppeId: string | null, stunden: number, kategorie: "fk" | "ek" = "fk"): TeamPresenceRow {
  return { team_id: Math.random().toString(), vorname: null, nachname: null, rolle: null, role_category: kategorie, wochenstunden: stunden, gruppe_id: gruppeId };
}

function kind(gruppeId: string, gewicht = 1): PresenceRow {
  return {
    kind_id: Math.random().toString(),
    gruppe_id: gruppeId,
    buchungszeit_band_id: "b",
    buchungszeit_label: "6-7h",
    buchungszeit_factor: 1.75,
    weighting_factor_id: null,
    weighting_factor_code: null,
    weighting_factor_label: null,
    weighting_factor_value: gewicht,
    weighting_factor_value_fachkraftquote: gewicht,
  };
}

const bwKontext: PersonalplanungKontext = {
  modell: "bw",
  vollzeitWochenstunden: 40,
  gruppen: [],
  tabelle: [
    { betriebsform: "ganztagsgruppe", altersmischung: false, referenzOeffnungszeitStunden: 7, referenzVzae: 2.3, stellenProStunde: 0.329 },
  ],
};

const nrwKontext: PersonalplanungKontext = {
  modell: "nrw",
  vollzeitWochenstunden: 39,
  gruppen: [],
  tabelle: [
    { gruppenform: "III", buchungszeitStunden: 45, fachkraftStunden: 49.5, ergaenzungskraftStunden: 49.5, leitungsfreistellungStunden: 9 },
  ],
};

const bayernKontext: PersonalplanungKontext = {
  modell: "bayern",
  vollzeitWochenstunden: 40,
  empfohlenerSchluessel: 10,
  staffingRules: { mindestschluessel: 11, fachkraftquoteAnteil: 0.5 },
};

describe("berechneGruppenStatus", () => {
  it("BW: Soll je Gruppe aus der Betriebsform, Ist aus dem Gruppenteam", () => {
    const g = gruppe({ id: "g1", bw_betriebsform: "ganztagsgruppe", bw_oeffnungszeit_stunden: 7, bw_randzeit_stunden: 1 });
    const ergebnis = berechneGruppenStatus([g], bwKontext, [kind("g1")], [person("g1", 92)]);
    // 2,3 VZÄ × 40 Std. = 92 Std. Soll
    expect(ergebnis.gruppen[0].personal.sollStunden).toBeCloseTo(92, 5);
    expect(ergebnis.gruppen[0].personal.ampel).toBe("gruen");
    expect(ergebnis.gruppen[0].belegt).toBe(1);
  });

  it("BW: zu wenig Stunden → gelb bis 90 %, darunter rot", () => {
    const g = gruppe({ id: "g1", bw_betriebsform: "ganztagsgruppe", bw_oeffnungszeit_stunden: 7, bw_randzeit_stunden: 1 });
    expect(berechneGruppenStatus([g], bwKontext, [], [person("g1", 85)]).gruppen[0].personal.ampel).toBe("gelb");
    expect(berechneGruppenStatus([g], bwKontext, [], [person("g1", 60)]).gruppen[0].personal.ampel).toBe("rot");
  });

  it("NRW: Fachkraft und Ergänzungskraft getrennt bewertet", () => {
    const g = gruppe({ id: "g1", nrw_gruppenform: "III", nrw_buchungszeit_stunden: 45 });
    const voll = berechneGruppenStatus([g], nrwKontext, [], [person("g1", 58.5, "fk"), person("g1", 49.5, "ek")]);
    expect(voll.gruppen[0].personal.ampel).toBe("gruen");
    expect(voll.gruppen[0].personal.fk).toEqual({ ist: 58.5, soll: 58.5 });
    // FK ausreichend, EK fehlt ganz → rot (nicht nur „gelb“ wie in der Einrichtungs-Ampel)
    const nurFk = berechneGruppenStatus([g], nrwKontext, [], [person("g1", 60, "fk")]);
    expect(nurFk.gruppen[0].personal.ampel).toBe("rot");
    // EK nur knapp (≥ 90 %) → gelb
    const knapp = berechneGruppenStatus([g], nrwKontext, [], [person("g1", 58.5, "fk"), person("g1", 46, "ek")]);
    expect(knapp.gruppen[0].personal.ampel).toBe("gelb");
    const nichts = berechneGruppenStatus([g], nrwKontext, [], [person("g1", 10, "fk")]);
    expect(nichts.gruppen[0].personal.ampel).toBe("rot");
  });

  it("Bayern: Richtwert aus der gewichteten Kinderzahl der Gruppe, Mindestschlüssel 1:11", () => {
    const g = gruppe({ id: "g1" });
    const kinder = Array.from({ length: 22 }, () => kind("g1", 1));
    // 22 gewichtete Kinder / 11 = 2 VZÄ = 80 Std. Soll bei 40 Std. Vollzeit
    const ok = berechneGruppenStatus([g], bayernKontext, kinder, [person("g1", 80)]);
    expect(ok.gruppen[0].personal.sollStunden).toBeCloseTo(80, 5);
    expect(ok.gruppen[0].personal.ampel).toBe("gruen");
    expect(ok.gruppen[0].personal.bayern?.schluessel).toBeCloseTo(11, 5);
    const knapp = berechneGruppenStatus([g], bayernKontext, kinder, [person("g1", 60)]);
    expect(knapp.gruppen[0].personal.ampel).toBe("rot");
  });

  it("Personal ohne Gruppe wird nicht verteilt, sondern getrennt ausgewiesen", () => {
    const g = gruppe({ id: "g1", bw_betriebsform: "ganztagsgruppe", bw_oeffnungszeit_stunden: 7, bw_randzeit_stunden: 1 });
    const ergebnis = berechneGruppenStatus([g], bwKontext, [], [person("g1", 30), person(null, 70)]);
    expect(ergebnis.gruppen[0].personal.istStunden).toBe(30);
    expect(ergebnis.ohneGruppeStunden).toBe(70);
    expect(ergebnis.zuordnungsquote).toBeCloseTo(0.3, 5);
    expect(ergebnis.belastbar).toBe(false);
  });

  it("ohne Personal ist die Zuordnung trivial belastbar", () => {
    const g = gruppe({ id: "g1" });
    const ergebnis = berechneGruppenStatus([g], bayernKontext, [], []);
    expect(ergebnis.zuordnungsquote).toBe(1);
    expect(ergebnis.belastbar).toBe(true);
  });
});

describe("ersterKritischerMonat", () => {
  it("nimmt den ersten roten Monat, sonst den ersten gelben", () => {
    expect(
      ersterKritischerMonat([
        { monat: "2026-10-01", ampel: "gruen" },
        { monat: "2026-11-01", ampel: "gelb" },
        { monat: "2027-01-01", ampel: "rot" },
      ])
    ).toEqual({ monat: "2027-01-01", ampel: "rot" });
    expect(
      ersterKritischerMonat([
        { monat: "2026-10-01", ampel: "gruen" },
        { monat: "2026-11-01", ampel: "gelb" },
      ])
    ).toEqual({ monat: "2026-11-01", ampel: "gelb" });
    expect(ersterKritischerMonat([{ monat: "2026-10-01", ampel: "gruen" }])).toBeNull();
  });
});
