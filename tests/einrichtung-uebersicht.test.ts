import { describe, expect, it } from "vitest";
import { filtereEinrichtungen, gruppiereNachBundesland } from "@/lib/einrichtung/bundesland-gruppen";
import { wechselZiel } from "@/lib/einrichtung/weiter-ziel";

const einrichtungen = [
  { id: "1", name: "Kita Löwenzahn", ort: "Düsseldorf", bundesland_code: "nrw" },
  { id: "2", name: "Testkita Bayern", ort: "München", bundesland_code: "by" },
  { id: "3", name: "Kita Sonnenschein", ort: "Augsburg", bundesland_code: "by" },
  { id: "4", name: "Kita Regenbogen", ort: "Karlsruhe", bundesland_code: "bw" },
];

describe("gruppiereNachBundesland", () => {
  it("ordnet Bayern, Baden-Württemberg, NRW und sortiert nach Name", () => {
    const gruppen = gruppiereNachBundesland(einrichtungen);
    expect(gruppen.map((g) => g.code)).toEqual(["by", "bw", "nrw"]);
    expect(gruppen[0].label).toBe("Bayern");
    expect(gruppen[0].einrichtungen.map((e) => e.name)).toEqual(["Kita Sonnenschein", "Testkita Bayern"]);
  });

  it("hängt unbekannte Bundesland-Codes hinten an", () => {
    const gruppen = gruppiereNachBundesland([...einrichtungen, { id: "5", name: "X", ort: null, bundesland_code: "xx" }]);
    expect(gruppen.at(-1)?.code).toBe("xx");
    expect(gruppen.at(-1)?.label).toBe("XX");
  });

  it("liefert bei leerer Liste keine Gruppen", () => {
    expect(gruppiereNachBundesland([])).toEqual([]);
  });
});

describe("filtereEinrichtungen", () => {
  it("findet nach Name oder Ort ohne Rücksicht auf Groß-/Kleinschreibung", () => {
    expect(filtereEinrichtungen(einrichtungen, "löwen", null).map((e) => e.id)).toEqual(["1"]);
    expect(filtereEinrichtungen(einrichtungen, "AUGSBURG", null).map((e) => e.id)).toEqual(["3"]);
  });

  it("kombiniert Suchtext und Bundesland", () => {
    expect(filtereEinrichtungen(einrichtungen, "kita", "by").map((e) => e.id)).toEqual(["2", "3"]);
    expect(filtereEinrichtungen(einrichtungen, "", "bw").map((e) => e.id)).toEqual(["4"]);
  });
});

describe("wechselZiel", () => {
  it("bleibt im selben Bereich, aber nie auf einer Detailseite", () => {
    expect(wechselZiel("/kinder")).toBe("/kinder");
    expect(wechselZiel("/kinder/abc-123/auskunft")).toBe("/kinder");
    expect(wechselZiel("/einstellungen/nutzer")).toBe("/einstellungen");
  });

  it("fällt bei unbekannten oder gefährlichen Zielen auf das Dashboard zurück", () => {
    expect(wechselZiel(null)).toBe("/dashboard");
    expect(wechselZiel("//evil.example")).toBe("/dashboard");
    expect(wechselZiel("https://evil.example")).toBe("/dashboard");
    expect(wechselZiel("/admin")).toBe("/dashboard");
  });
});
