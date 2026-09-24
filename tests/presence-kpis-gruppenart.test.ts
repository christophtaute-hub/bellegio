import { describe, expect, it } from "vitest";
import { buildKpisByGruppenart, type PresenceRow } from "@/lib/dashboard/presence";

function zeile(gruppeId: string | null, buchungszeitFactor: number, weightingFactorValue: number): PresenceRow {
  return {
    kind_id: Math.random().toString(),
    gruppe_id: gruppeId,
    buchungszeit_band_id: "b",
    buchungszeit_label: "6-7h",
    buchungszeit_factor: buchungszeitFactor,
    weighting_factor_id: null,
    weighting_factor_code: null,
    weighting_factor_label: null,
    weighting_factor_value: weightingFactorValue,
    weighting_factor_value_fachkraftquote: weightingFactorValue,
  };
}

describe("buildKpisByGruppenart", () => {
  const gruppen = [
    { id: "krippe-1", gruppenart: "krippe" },
    { id: "kiga-1", gruppenart: "kindergarten" },
  ];

  it("teilt ungewichtete und gewichtete Summen korrekt nach Gruppenart auf", () => {
    const rows = [
      zeile("krippe-1", 1.75, 2.0),
      zeile("krippe-1", 1.75, 2.0),
      zeile("kiga-1", 1.75, 1.0),
    ];
    const ergebnis = buildKpisByGruppenart(rows, gruppen);

    const krippe = ergebnis.find((e) => e.gruppenart === "krippe");
    expect(krippe?.kpis.kinderGesamt).toBe(2);
    expect(krippe?.kpis.ungewichteteSumme).toBeCloseTo(3.5, 10);
    expect(krippe?.kpis.gewichteteSumme).toBeCloseTo(7.0, 10);

    const kiga = ergebnis.find((e) => e.gruppenart === "kindergarten");
    expect(kiga?.kpis.kinderGesamt).toBe(1);
    expect(kiga?.kpis.ungewichteteSumme).toBeCloseTo(1.75, 10);
    expect(kiga?.kpis.gewichteteSumme).toBeCloseTo(1.75, 10);
  });

  it("sortiert absteigend nach Kinderzahl", () => {
    const rows = [zeile("kiga-1", 1, 1), zeile("krippe-1", 1, 1), zeile("krippe-1", 1, 1)];
    const ergebnis = buildKpisByGruppenart(rows, gruppen);
    expect(ergebnis.map((e) => e.gruppenart)).toEqual(["krippe", "kindergarten"]);
  });

  it("Kinder ohne Gruppe oder mit unbekannter Gruppe landen unter 'unbekannt'", () => {
    const rows = [zeile(null, 1, 1), zeile("nicht-vorhanden", 1, 1)];
    const ergebnis = buildKpisByGruppenart(rows, gruppen);
    expect(ergebnis).toHaveLength(1);
    expect(ergebnis[0].gruppenart).toBe("unbekannt");
    expect(ergebnis[0].kpis.kinderGesamt).toBe(2);
  });

  it("keine Kinder: leeres Ergebnis", () => {
    expect(buildKpisByGruppenart([], gruppen)).toEqual([]);
  });
});
