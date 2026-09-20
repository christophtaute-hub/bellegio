import { describe, expect, it } from "vitest";
import { kategorieAusRolle, parseKategorie, pruefeTeamImport, type TeamImportKontext } from "@/lib/import/team";

const kontext: TeamImportKontext = {
  gruppen: [{ id: "g1", name: "Pinguine" }],
  vorhandene: [{ vorname: "Erika", nachname: "Alt" }],
};

const basis = { Vorname: "Anna", Nachname: "Beispiel", Rolle: "Pädagogische Fachkraft (Erzieher/in)", Wochenstunden: "39" };

describe("Personal-Import", () => {
  it("übernimmt eine Fachkraft und leitet die Kategorie aus der Rolle ab", () => {
    const z = pruefeTeamImport([basis], kontext).zeilen[0];
    expect(z.mitglied).toMatchObject({ role_category: "fk", wochenstunden: 39, status: "aktiv", gruppe_id: null });
    expect(z.status).toBe("warnung");
    expect(z.meldungen.join(" ")).toContain("Kategorie aus der Rolle abgeleitet");
  });

  it("nimmt eine ausdrückliche Kategorie ohne Hinweis", () => {
    const z = pruefeTeamImport([{ ...basis, Kategorie: "Ergänzungskraft" }], kontext).zeilen[0];
    expect(z.mitglied?.role_category).toBe("ek");
    expect(z.status).toBe("ok");
  });

  it("ergänzt eine Standardrolle, wenn nur die Kategorie angegeben ist", () => {
    const z = pruefeTeamImport([{ Vorname: "Bo", Nachname: "Test", Kategorie: "FK", Wochenstunden: "20" }], kontext).zeilen[0];
    expect(z.mitglied?.rolle).toBe("Pädagogische Fachkraft (Erzieher/in)");
  });

  it("verlangt Wochenstunden zwischen 0 und 60", () => {
    expect(pruefeTeamImport([{ ...basis, Wochenstunden: "" }], kontext).zeilen[0].status).toBe("fehler");
    expect(pruefeTeamImport([{ ...basis, Wochenstunden: "80" }], kontext).zeilen[0].status).toBe("fehler");
    expect(pruefeTeamImport([{ ...basis, Wochenstunden: "37,5" }], kontext).zeilen[0].mitglied?.wochenstunden).toBe(37.5);
  });

  it("verlangt eine ableitbare Kategorie", () => {
    const z = pruefeTeamImport([{ ...basis, Rolle: "Springer" }], kontext).zeilen[0];
    expect(z.status).toBe("fehler");
    expect(z.meldungen.join(" ")).toContain("Kategorie");
  });

  it("erkennt Dubletten gegen den Bestand", () => {
    const erg = pruefeTeamImport([{ ...basis, Vorname: "Erika", Nachname: "Alt" }, basis], kontext);
    expect(erg.zeilen[0].status).toBe("duplikat");
    expect(erg.uebernehmbar).toBe(1);
  });

  it("meldet unbekannte Gruppen", () => {
    expect(pruefeTeamImport([{ ...basis, Gruppe: "Delfine" }], kontext).zeilen[0].status).toBe("fehler");
    expect(pruefeTeamImport([{ ...basis, Gruppe: "pinguine" }], kontext).zeilen[0].mitglied?.gruppe_id).toBe("g1");
  });

  it("meldet fehlende Pflichtspalten", () => {
    const erg = pruefeTeamImport([{ Vorname: "A", Nachname: "B" }], kontext);
    expect(erg.fehlendeSpalten).toContain("Wochenstunden");
    expect(erg.fehlendeSpalten).toContain("Rolle oder Kategorie");
  });

  it("Kategorie-Erkennung", () => {
    expect(parseKategorie("Fachkraft")).toBe("fk");
    expect(parseKategorie("Kinderpflegerin")).toBe("ek");
    expect(parseKategorie("Hausmeister")).toBe("hausmeister");
    expect(kategorieAusRolle("Stellvertretende Leitung")).toBe("fk");
    expect(kategorieAusRolle("FSJ/BFD")).toBe("ak");
    expect(kategorieAusRolle("Hauswirtschaft/Verwaltung")).toBe("hauswirtschaft");
  });
});
