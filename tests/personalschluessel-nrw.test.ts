import { describe, expect, it } from "vitest";
import {
  buildNRWPersonalplanung,
  findeNRWZeile,
  type NRWGruppe,
  type NRWPersonalstundenRow,
} from "@/lib/team/personalschluessel-nrw";

const tabelle: NRWPersonalstundenRow[] = [
  { gruppenform: "I", buchungszeitStunden: 35, fachkraftStunden: 100, ergaenzungskraftStunden: 30, leitungsfreistellungStunden: 5 },
  { gruppenform: "II", buchungszeitStunden: 45, fachkraftStunden: 120, ergaenzungskraftStunden: 40, leitungsfreistellungStunden: 6 },
];

const gruppeI: NRWGruppe = { id: "g1", name: "Sonne", nrwGruppenform: "I", nrwBuchungszeitStunden: 35 };
const gruppeII: NRWGruppe = { id: "g2", name: "Mond", nrwGruppenform: "II", nrwBuchungszeitStunden: 45 };

describe("NRW: Fachkraft- und Ergänzungskraft-Stunden (KiBiz)", () => {
  it("findet die Zeile für Gruppenform und Buchungszeit", () => {
    expect(findeNRWZeile(gruppeI, tabelle)?.fachkraftStunden).toBe(100);
  });

  it("findet nichts ohne Gruppenform, ohne Buchungszeit oder bei unbekannter Kombination", () => {
    expect(findeNRWZeile({ ...gruppeI, nrwGruppenform: null }, tabelle)).toBeUndefined();
    expect(findeNRWZeile({ ...gruppeI, nrwBuchungszeitStunden: null }, tabelle)).toBeUndefined();
    expect(findeNRWZeile({ ...gruppeI, nrwBuchungszeitStunden: 25 }, tabelle)).toBeUndefined();
  });

  it("Soll-Fachkraft enthält die Leitungsfreistellung: 100 + 5 = 105", () => {
    const plan = buildNRWPersonalplanung([gruppeI], tabelle, 105, 30);
    expect(plan.sollFachkraftStundenGesamt).toBe(105);
    expect(plan.sollErgaenzungskraftStundenGesamt).toBe(30);
    expect(plan.ampel).toBe("gruen");
  });

  it("summiert mehrere Gruppen: 105 + 126 = 231 FK-Std., 30 + 40 = 70 EK-Std.", () => {
    const plan = buildNRWPersonalplanung([gruppeI, gruppeII], tabelle, 231, 70);
    expect(plan.sollFachkraftStundenGesamt).toBe(231);
    expect(plan.sollErgaenzungskraftStundenGesamt).toBe(70);
  });

  it("Ampel: nur eine Qualifikation erfüllt = gelb, beide unterschritten = rot", () => {
    expect(buildNRWPersonalplanung([gruppeI], tabelle, 105, 0).ampel).toBe("gelb");
    expect(buildNRWPersonalplanung([gruppeI], tabelle, 0, 30).ampel).toBe("gelb");
    expect(buildNRWPersonalplanung([gruppeI], tabelle, 50, 10).ampel).toBe("rot");
  });

  it("ohne konfigurierte Gruppen ist die Ampel grün", () => {
    expect(buildNRWPersonalplanung([], tabelle, 0, 0).ampel).toBe("gruen");
  });

  it("eine Gruppe ohne passende Tabellenzeile trägt nichts zum Soll bei", () => {
    const plan = buildNRWPersonalplanung([{ ...gruppeI, nrwBuchungszeitStunden: 25 }], tabelle, 0, 0);
    expect(plan.sollFachkraftStundenGesamt).toBe(0);
  });
});
