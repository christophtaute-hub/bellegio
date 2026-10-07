import { describe, expect, it } from "vitest";
import { hoechsterFaktor, kindergartenjahrEnde, leiteBasisfaktorAb } from "@/lib/kinder/basisfaktor";

const ableiten = (geb: string, stichtag: string, art: string | null) =>
  leiteBasisfaktorAb({ geburtsdatum: geb, stichtag, gruppenartBeiDrittemGeburtstag: art });

describe("Basisfaktor Bayern", () => {
  it("unter drei Jahren: 2,0", () => {
    expect(ableiten("2023-10-15", "2026-10-14", "kindergarten")).toBe("u3");
  });
  it("Kindergarten: ab dem dritten Geburtstag 1,0", () => {
    expect(ableiten("2023-10-15", "2026-10-15", "kindergarten")).toBe("ue3_bis_schuleintritt");
  });
  it("Krippe: 2,0 bis zum Ende des Kindergartenjahres, danach 1,0", () => {
    expect(ableiten("2023-10-15", "2026-10-15", "krippe")).toBe("u3");
    expect(ableiten("2023-10-15", "2027-08-31", "krippe")).toBe("u3");
    expect(ableiten("2023-10-15", "2027-09-01", "krippe")).toBe("ue3_bis_schuleintritt");
  });
  it("Krippe: dritter Geburtstag im Sommer, Kindergartenjahr endet am 31.08. desselben Jahres", () => {
    expect(ableiten("2023-06-10", "2026-08-31", "krippe")).toBe("u3");
    expect(ableiten("2023-06-10", "2026-09-01", "krippe")).toBe("ue3_bis_schuleintritt");
  });
  it("Kindergartenjahr-Ende", () => {
    expect(kindergartenjahrEnde("2026-10-15", 9)).toBe("2027-08-31");
    expect(kindergartenjahrEnde("2026-08-31", 9)).toBe("2026-08-31");
    expect(kindergartenjahrEnde("2026-09-01", 9)).toBe("2027-08-31");
  });
});

describe("hoechsterFaktor", () => {
  const integration = { code: "integrationskinder", label: "Integrationskinder", factor: 4.5 };
  it("Sondermerkmal schlägt den Basisfaktor", () => {
    expect(hoechsterFaktor("u3", [integration])?.code).toBe("integrationskinder");
  });
  it("manuelle Basiszeilen werden ignoriert", () => {
    const manuell = [{ code: "u3", label: "alt", factor: 2 }];
    expect(hoechsterFaktor("ue3_bis_schuleintritt", manuell)?.factor).toBe(1);
  });
  it("ohne Basisfaktor (andere Länder) zählt der höchste manuelle", () => {
    expect(hoechsterFaktor(null, [integration])?.factor).toBe(4.5);
    expect(hoechsterFaktor(null, [])).toBeNull();
  });
});
