import { describe, expect, it } from "vitest";
import { rechtsstandHinweise } from "@/lib/regelwerk/rechtsstand";
import { resolveBayernBasiswertAmStichtag, type BayernBasiswertVersion } from "@/lib/finanzen/foerdererloese";

const monate = (von: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(Number(von.slice(0, 4)), Number(von.slice(5, 7)) - 1 + i, 1));
    return d.toISOString().slice(0, 10);
  });

describe("Rechtsstand-Hinweise", () => {
  it("Bayern: erst ab Januar 2027 und nur mit Finanzübersicht", () => {
    expect(rechtsstandHinweise({ bundeslandCode: "by", monate: monate("2026-01-01", 12), zeigeFinanzen: true })).toHaveLength(0);
    expect(rechtsstandHinweise({ bundeslandCode: "by", monate: monate("2026-09-01", 12), zeigeFinanzen: true })).toHaveLength(1);
    expect(rechtsstandHinweise({ bundeslandCode: "by", monate: monate("2026-09-01", 12), zeigeFinanzen: false })).toHaveLength(0);
  });
  it("NRW: ab August 2027", () => {
    expect(rechtsstandHinweise({ bundeslandCode: "nrw", monate: monate("2026-08-01", 12), zeigeFinanzen: false })).toHaveLength(0);
    expect(rechtsstandHinweise({ bundeslandCode: "nrw", monate: monate("2026-08-01", 13), zeigeFinanzen: false })).toHaveLength(1);
  });
  it("BW: bis August 2027 (Übergangsregel)", () => {
    expect(rechtsstandHinweise({ bundeslandCode: "bw", monate: monate("2026-09-01", 12), zeigeFinanzen: false })).toHaveLength(1);
    expect(rechtsstandHinweise({ bundeslandCode: "bw", monate: monate("2027-09-01", 12), zeigeFinanzen: false })).toHaveLength(0);
  });
});

describe("Bayern-Basiswert nach Reform", () => {
  const versionen: BayernBasiswertVersion[] = [
    { basiswert: 1563.88, qualitaetsbonus: 268.01, gueltigAb: "2026-01-01", gueltigBis: "2027-01-01" },
    { basiswert: 1563.88, qualitaetsbonus: 693.28, gueltigAb: "2027-01-01", gueltigBis: "2028-01-01" },
    { basiswert: 1563.88, qualitaetsbonus: 852.36, gueltigAb: "2028-01-01", gueltigBis: "2029-01-01" },
    { basiswert: 1563.88, qualitaetsbonus: 857.87, gueltigAb: "2029-01-01", gueltigBis: null },
  ];
  it("löst den Qualitätsbonus je Stichtag auf", () => {
    expect(resolveBayernBasiswertAmStichtag(versionen, "2026-12-01")?.qualitaetsbonus).toBe(268.01);
    expect(resolveBayernBasiswertAmStichtag(versionen, "2027-01-01")?.qualitaetsbonus).toBe(693.28);
    expect(resolveBayernBasiswertAmStichtag(versionen, "2028-06-01")?.qualitaetsbonus).toBe(852.36);
    expect(resolveBayernBasiswertAmStichtag(versionen, "2030-01-01")?.qualitaetsbonus).toBe(857.87);
  });
});
