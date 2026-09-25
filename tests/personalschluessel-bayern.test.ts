import { describe, expect, it } from "vitest";
import {
  buildPersonalplanung,
  resolveStaffingRulesAmStichtag,
  BAYERN_MINDESTSCHLUESSEL,
  BAYERN_FACHKRAFTQUOTE_ANTEIL,
  type StaffingRulesVersion,
  type TeamPresenceRow,
} from "@/lib/team/anstellungsschluessel";

function team(fk: number, ek: number): TeamPresenceRow[] {
  return [
    { role_category: "fk", wochenstunden: fk },
    { role_category: "ek", wochenstunden: ek },
  ] as TeamPresenceRow[];
}

describe("Bayern: Anstellungsschlüssel (§17 AVBayKiBiG, 1:11,0)", () => {
  it("22 gewichtete Kinder bei 2,0 VZÄ ergeben genau 1:11,0 — erlaubt und grün", () => {
    // 78 Std. / 39 Std. = 2,0 VZÄ; 22 / 2,0 = 11,0; Soll-FK = 0,5 × 22/11 = 1,0 VZÄ = 39 Std.
    const p = buildPersonalplanung(team(39, 39), 22, 22, 39);
    expect(p.vzaeIst).toBeCloseTo(2, 10);
    expect(p.vzaeSoll).toBeCloseTo(2, 10);
    expect(p.anstellungsschluessel).toBe(11);
    expect(p.mindestschluesselOk).toBe(true);
    expect(p.qualifikationsschluesselOk).toBe(true);
    expect(p.ampel).toBe("gruen");
  });

  it("23 gewichtete Kinder bei 2,0 VZÄ überschreiten 1:11,0 — rot", () => {
    const p = buildPersonalplanung(team(39, 39), 23, 23, 39);
    expect(p.anstellungsschluessel).toBe(11.5);
    expect(p.mindestschluesselOk).toBe(false);
    expect(p.ampel).toBe("rot");
  });

  it("Schlüssel passt, aber Fachkraftquote (50 %) nicht — gelb", () => {
    // 2,0 VZÄ, davon nur 0,5 FK; Soll-FK 1,0 VZÄ.
    const p = buildPersonalplanung(team(19.5, 58.5), 22, 22, 39);
    expect(p.mindestschluesselOk).toBe(true);
    expect(p.qualifikationsschluesselOk).toBe(false);
    expect(p.ampel).toBe("gelb");
  });

  it("der Integrationsfaktor zählt für die Fachkraftquote nicht mit", () => {
    // gewichtet 26,5 (mit I-Kind), für die Fachkraftquote nur 22.
    const p = buildPersonalplanung(team(39, 39), 26.4, 22, 39);
    expect(p.vzaeSollFachkraft).toBeCloseTo(1, 10);
  });

  it("ohne Personal gibt es keinen Schlüssel und die Ampel ist rot", () => {
    const p = buildPersonalplanung([], 10, 10, 39);
    expect(p.anstellungsschluessel).toBeNull();
    expect(p.mindestschluesselOk).toBe(false);
    expect(p.ampel).toBe("rot");
  });

  it("ohne Kinder ist alles grün, auch ohne Personal", () => {
    expect(buildPersonalplanung([], 0, 0, 39).ampel).toBe("gruen");
  });

  it("rechnet mit der Vollzeitreferenz des Trägers (40 statt 39 Std.)", () => {
    const p = buildPersonalplanung(team(40, 40), 22, 22, 40);
    expect(p.vzaeIst).toBeCloseTo(2, 10);
    expect(p.anstellungsschluessel).toBe(11);
  });

  it("die eigene Zielgröße ist unabhängig vom gesetzlichen Mindestschlüssel", () => {
    const p = buildPersonalplanung(team(39, 39), 22, 22, 39, 10);
    expect(p.mindestschluesselOk).toBe(true);
    expect(p.empfohlenerSchluesselOk).toBe(false);
  });
});

describe("resolveStaffingRulesAmStichtag (Milestone 29b, Regelwerk-Historie)", () => {
  it("liefert vor einer Reform den alten, ab dem Inkrafttreten den neuen Mindestschlüssel", () => {
    const versionen: StaffingRulesVersion[] = [
      { mindestschluessel: 11.0, fachkraftquoteAnteil: 0.5, gueltigAb: "2020-01-01", gueltigBis: "2027-09-01" },
      { mindestschluessel: 10.5, fachkraftquoteAnteil: 0.5, gueltigAb: "2027-09-01", gueltigBis: null },
    ];
    expect(resolveStaffingRulesAmStichtag(versionen, "2027-01-01").mindestschluessel).toBe(11.0);
    expect(resolveStaffingRulesAmStichtag(versionen, "2027-09-01").mindestschluessel).toBe(10.5);
  });

  it("ohne jede erfasste Version fällt es auf die Bayern-Konstanten zurück", () => {
    const ergebnis = resolveStaffingRulesAmStichtag([], "2026-09-24");
    expect(ergebnis).toEqual({ mindestschluessel: BAYERN_MINDESTSCHLUESSEL, fachkraftquoteAnteil: BAYERN_FACHKRAFTQUOTE_ANTEIL });
  });

  it("fällt bei einem Stichtag vor der ersten erfassten Fassung auf die älteste bekannte zurück (nie 'keine Regel')", () => {
    const versionen: StaffingRulesVersion[] = [
      { mindestschluessel: 11.0, fachkraftquoteAnteil: 0.5, gueltigAb: "2025-01-01", gueltigBis: null },
    ];
    expect(resolveStaffingRulesAmStichtag(versionen, "2015-01-01").mindestschluessel).toBe(11.0);
  });
});
