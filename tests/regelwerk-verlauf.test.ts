import { describe, expect, it } from "vitest";
import { versionAmStichtag, versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";

type Wert = Versioniert & { wert: number };

describe("versionAmStichtag", () => {
  it("liefert die einzige, aktuell gültige Version (gueltigBis: null) unabhängig vom Stichtag-Abstand", () => {
    const versionen: Wert[] = [{ wert: 11, gueltigAb: "2020-01-01", gueltigBis: null }];
    expect(versionAmStichtag(versionen, "2026-06-15")?.wert).toBe(11);
    expect(versionAmStichtag(versionen, "2020-01-01")?.wert).toBe(11);
  });

  it("wählt bei mehreren historischen Versionen die zum Stichtag passende", () => {
    const versionen: Wert[] = [
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2025-01-01" },
      { wert: 11, gueltigAb: "2025-01-01", gueltigBis: "2027-08-01" },
      { wert: 12, gueltigAb: "2027-08-01", gueltigBis: null },
    ];
    expect(versionAmStichtag(versionen, "2022-06-01")?.wert).toBe(10);
    expect(versionAmStichtag(versionen, "2026-01-01")?.wert).toBe(11);
    expect(versionAmStichtag(versionen, "2030-01-01")?.wert).toBe(12);
  });

  it("Grenzfall: Stichtag genau auf gueltigAb trifft diese Version", () => {
    const versionen: Wert[] = [
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2025-01-01" },
      { wert: 11, gueltigAb: "2025-01-01", gueltigBis: null },
    ];
    expect(versionAmStichtag(versionen, "2025-01-01")?.wert).toBe(11);
  });

  it("Grenzfall: Stichtag genau auf gueltigBis trifft NICHT mehr diese, sondern die nächste Version", () => {
    const versionen: Wert[] = [
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2025-01-01" },
      { wert: 11, gueltigAb: "2025-01-01", gueltigBis: null },
    ];
    const treffer = versionAmStichtag(versionen, "2025-01-01");
    expect(treffer?.wert).not.toBe(10);
    expect(treffer?.wert).toBe(11);
  });

  it("ist unabhängig von der Reihenfolge der Eingabe-Versionen", () => {
    const versionen: Wert[] = [
      { wert: 12, gueltigAb: "2027-08-01", gueltigBis: null },
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2025-01-01" },
      { wert: 11, gueltigAb: "2025-01-01", gueltigBis: "2027-08-01" },
    ];
    expect(versionAmStichtag(versionen, "2026-01-01")?.wert).toBe(11);
  });

  it("leeres Array liefert null", () => {
    expect(versionAmStichtag<Wert>([], "2026-01-01")).toBeNull();
  });

  it("Stichtag vor der ersten bekannten Fassung liefert null", () => {
    const versionen: Wert[] = [{ wert: 10, gueltigAb: "2020-01-01", gueltigBis: null }];
    expect(versionAmStichtag(versionen, "2015-01-01")).toBeNull();
  });

  it("eine echte Lücke in der Historie liefert null statt eine falsche Version zu raten", () => {
    const versionen: Wert[] = [
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2022-01-01" },
      { wert: 11, gueltigAb: "2023-01-01", gueltigBis: null },
    ];
    expect(versionAmStichtag(versionen, "2022-06-01")).toBeNull();
  });
});

describe("versionAmStichtagMitFallback", () => {
  it("liefert wie versionAmStichtag, wenn eine passende Version existiert", () => {
    const versionen: Wert[] = [{ wert: 10, gueltigAb: "2020-01-01", gueltigBis: null }];
    expect(versionAmStichtagMitFallback(versionen, "2026-01-01")?.wert).toBe(10);
  });

  it("fällt bei einem Stichtag vor der ersten Fassung auf die älteste bekannte Version zurück", () => {
    const versionen: Wert[] = [
      { wert: 11, gueltigAb: "2025-01-01", gueltigBis: null },
      { wert: 10, gueltigAb: "2020-01-01", gueltigBis: "2025-01-01" },
    ];
    expect(versionAmStichtagMitFallback(versionen, "2015-01-01")?.wert).toBe(10);
  });

  it("fällt auch bei einer echten Lücke auf die älteste bekannte Version zurück", () => {
    const versionen: Wert[] = [
      { wert: 10, gueltigAb: "2023-01-01", gueltigBis: "2025-01-01" },
      { wert: 11, gueltigAb: "2026-01-01", gueltigBis: null },
    ];
    expect(versionAmStichtagMitFallback(versionen, "2025-06-01")?.wert).toBe(10);
  });

  it("leeres Array liefert null (kein Rückfall möglich)", () => {
    expect(versionAmStichtagMitFallback<Wert>([], "2026-01-01")).toBeNull();
  });
});
