import { describe, expect, it } from "vitest";
import { pruefeGruppe, type GruppeInput } from "@/lib/gruppen/optionen";

const basis: GruppeInput = {
  name: "Sonnengruppe",
  gruppenart: "kindergarten",
  sollplatze: 20,
  bwBetriebsform: null,
  bwAltersmischung: false,
  bwOeffnungszeitStunden: null,
  bwRandzeitStunden: null,
  nrwGruppenform: null,
  nrwBuchungszeitStunden: null,
};

describe("Gruppen-Validierung", () => {
  it("Bayern: braucht nur Name, Art und Plätze — Fremdfelder werden verworfen", () => {
    const erg = pruefeGruppe(
      { ...basis, bwBetriebsform: "ganztagsgruppe", bwOeffnungszeitStunden: 9, nrwGruppenform: "I", nrwBuchungszeitStunden: 35 },
      "by"
    );
    expect(erg.fehler).toBeNull();
    expect(erg.felder).toMatchObject({
      name: "Sonnengruppe",
      bw_betriebsform: null,
      bw_oeffnungszeit_stunden: null,
      nrw_gruppenform: null,
      nrw_buchungszeit_stunden: null,
    });
  });

  it("verlangt einen Namen, eine bekannte Gruppenart und ganzzahlige Sollplätze von 1 bis 200", () => {
    expect(pruefeGruppe({ ...basis, name: "  " }, "by").fehler).toMatch(/Namen/);
    expect(pruefeGruppe({ ...basis, gruppenart: "spielkreis" }, "by").fehler).toMatch(/Gruppenart/);
    expect(pruefeGruppe({ ...basis, sollplatze: 0 }, "by").fehler).toMatch(/Sollplätze/);
    expect(pruefeGruppe({ ...basis, sollplatze: 12.5 }, "by").fehler).toMatch(/Sollplätze/);
    expect(pruefeGruppe({ ...basis, sollplatze: Number.NaN }, "by").fehler).toMatch(/Sollplätze/);
    expect(pruefeGruppe({ ...basis, sollplatze: 201 }, "by").fehler).toMatch(/Sollplätze/);
  });

  it("BW: Betriebsform und Öffnungszeit sind Pflicht", () => {
    expect(pruefeGruppe(basis, "bw").fehler).toMatch(/Betriebsform/);
    expect(pruefeGruppe({ ...basis, bwBetriebsform: "regelgruppe" }, "bw").fehler).toMatch(/Öffnungszeit/);
    expect(pruefeGruppe({ ...basis, bwBetriebsform: "regelgruppe", bwOeffnungszeitStunden: 20 }, "bw").fehler).toMatch(/Öffnungszeit/);
    expect(pruefeGruppe({ ...basis, bwBetriebsform: "kaffeekraenzchen", bwOeffnungszeitStunden: 7 }, "bw").fehler).toMatch(/Betriebsform/);
  });

  it("BW: Altersmischung gibt es nur bei Regel-, Halbtags- und VÖ-Gruppen", () => {
    const regel = pruefeGruppe({ ...basis, bwBetriebsform: "regelgruppe", bwAltersmischung: true, bwOeffnungszeitStunden: 6 }, "bw");
    expect(regel.felder?.bw_altersmischung).toBe(true);
    const ganztag = pruefeGruppe({ ...basis, bwBetriebsform: "ganztagsgruppe", bwAltersmischung: true, bwOeffnungszeitStunden: 9 }, "bw");
    expect(ganztag.felder?.bw_altersmischung).toBe(false);
  });

  it("BW: Randzeit nur bei Betriebsformen mit Randzeit-Trennung relevant", () => {
    // Reine Regelgruppe ohne Altersmischung: keine Randzeit-Trennung, ein gesetzter Wert wird verworfen.
    const regel = pruefeGruppe(
      { ...basis, bwBetriebsform: "regelgruppe", bwOeffnungszeitStunden: 6, bwRandzeitStunden: 3 },
      "bw"
    );
    expect(regel.felder?.bw_randzeit_stunden).toBeNull();

    // Ganztagsgruppe: Randzeit-Trennung gilt, ein gültiger Wert wird übernommen.
    const ganztag = pruefeGruppe(
      { ...basis, bwBetriebsform: "ganztagsgruppe", bwOeffnungszeitStunden: 9, bwRandzeitStunden: 2 },
      "bw"
    );
    expect(ganztag.felder?.bw_randzeit_stunden).toBe(2);

    // Ohne Angabe (null) bleibt es beim gesetzlichen Standardwert — kein Fehler.
    const ohneAngabe = pruefeGruppe(
      { ...basis, bwBetriebsform: "ganztagsgruppe", bwOeffnungszeitStunden: 9, bwRandzeitStunden: null },
      "bw"
    );
    expect(ohneAngabe.fehler).toBeNull();
    expect(ohneAngabe.felder?.bw_randzeit_stunden).toBeNull();
  });

  it("BW: Randzeit darf nicht negativ und nicht länger als die Öffnungszeit sein", () => {
    expect(
      pruefeGruppe({ ...basis, bwBetriebsform: "ganztagsgruppe", bwOeffnungszeitStunden: 9, bwRandzeitStunden: -1 }, "bw").fehler
    ).toMatch(/Randzeit/);
    expect(
      pruefeGruppe({ ...basis, bwBetriebsform: "ganztagsgruppe", bwOeffnungszeitStunden: 9, bwRandzeitStunden: 10 }, "bw").fehler
    ).toMatch(/Randzeit/);
  });

  it("BW: verwirft NRW-Felder", () => {
    const erg = pruefeGruppe(
      { ...basis, bwBetriebsform: "regelgruppe", bwOeffnungszeitStunden: 6, nrwGruppenform: "II", nrwBuchungszeitStunden: 45 },
      "bw"
    );
    expect(erg.felder).toMatchObject({ nrw_gruppenform: null, nrw_buchungszeit_stunden: null, bw_oeffnungszeit_stunden: 6 });
  });

  it("NRW: Gruppenform I/II/III und Buchungszeit 25/35/45 sind Pflicht", () => {
    expect(pruefeGruppe(basis, "nrw").fehler).toMatch(/Gruppenform/);
    expect(pruefeGruppe({ ...basis, nrwGruppenform: "IV", nrwBuchungszeitStunden: 35 }, "nrw").fehler).toMatch(/Gruppenform/);
    expect(pruefeGruppe({ ...basis, nrwGruppenform: "II", nrwBuchungszeitStunden: 40 }, "nrw").fehler).toMatch(/Buchungszeit/);
    const ok = pruefeGruppe({ ...basis, nrwGruppenform: "II", nrwBuchungszeitStunden: 45, bwBetriebsform: "regelgruppe" }, "nrw");
    expect(ok.felder).toMatchObject({ nrw_gruppenform: "II", nrw_buchungszeit_stunden: 45, bw_betriebsform: null });
  });
});
