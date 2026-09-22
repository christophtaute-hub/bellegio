import { describe, expect, it } from "vitest";
import { ermittleLangzeitHinweise, istLangzeitArt, type AusfallRoh } from "@/lib/team/langzeithinweise";

const heute = "2026-09-22";
const basis = (t: Partial<AusfallRoh>): AusfallRoh => ({ teamId: "t1", name: "Anna Test", art: "krankheit", von: "2026-09-01", bis: null, ...t });

describe("Langzeit-Ausfallarten", () => {
  it("erkennt Krankheit, Schwangerschaft und Mutterschutz, nicht Sonderurlaub oder Sonstiges", () => {
    expect(istLangzeitArt("krankheit")).toBe(true);
    expect(istLangzeitArt("schwangerschaft")).toBe(true);
    expect(istLangzeitArt("mutterschutz")).toBe(true);
    expect(istLangzeitArt("sonderurlaub")).toBe(false);
    expect(istLangzeitArt("sonstiges")).toBe(false);
  });
});

describe("Aktive Langzeit-Hinweise am Stichtag", () => {
  it("zeigt eine offene (unbefristete) Krankheit", () => {
    expect(ermittleLangzeitHinweise([basis({})], heute)).toHaveLength(1);
  });

  it("zeigt eine befristete Abwesenheit nur innerhalb ihres Zeitraums", () => {
    const a = basis({ von: "2026-08-01", bis: "2026-09-30" });
    expect(ermittleLangzeitHinweise([a], "2026-09-22")).toHaveLength(1);
    expect(ermittleLangzeitHinweise([a], "2026-10-01")).toHaveLength(0);
    expect(ermittleLangzeitHinweise([a], "2026-07-31")).toHaveLength(0);
  });

  it("blendet Sonderurlaub und Sonstiges aus", () => {
    expect(ermittleLangzeitHinweise([basis({ art: "sonderurlaub" }), basis({ art: "sonstiges" })], heute)).toEqual([]);
  });

  it("sortiert nach Namen", () => {
    const liste = [basis({ teamId: "b", name: "Zoe" }), basis({ teamId: "a", name: "Anna" })];
    expect(ermittleLangzeitHinweise(liste, heute).map((h) => h.name)).toEqual(["Anna", "Zoe"]);
  });
});
