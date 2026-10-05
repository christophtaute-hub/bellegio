import { describe, expect, it } from "vitest";
import { loeseZeitraumAuf, zeitraumEnde, zeitraumMonate, MAX_MONATE } from "@/lib/controlling/zeitraum";
import { kitajahrBeginnStandard, kitajahrLabel, kitajahrStartJahr } from "@/lib/kita-datum";

const HEUTE = new Date(Date.UTC(2026, 9, 5)); // 05.10.2026

describe("Kitajahr je Bundesland", () => {
  it("Vorgaben: BY/BW September, NRW August", () => {
    expect(kitajahrBeginnStandard("by")).toBe(9);
    expect(kitajahrBeginnStandard("bw")).toBe(9);
    expect(kitajahrBeginnStandard("nrw")).toBe(8);
    expect(kitajahrBeginnStandard(null)).toBe(9);
  });
  it("Startjahr und Label", () => {
    expect(kitajahrStartJahr(new Date(Date.UTC(2026, 7, 15)), 9)).toBe(2025); // August: noch im Kitajahr 2025/26
    expect(kitajahrStartJahr(new Date(Date.UTC(2026, 7, 15)), 8)).toBe(2026); // NRW: seit 1. August 2026/27
    expect(kitajahrLabel(2026, 9)).toBe("2026/27");
    expect(kitajahrLabel(2026, 1)).toBe("2026");
  });
});

describe("loeseZeitraumAuf", () => {
  it("Standard ist das laufende Kitajahr", () => {
    const z = loeseZeitraumAuf({}, 9, HEUTE);
    expect(z).toMatchObject({ art: "kitajahr", von: "2026-09-01", monate: 12, label: "Kitajahr 2026/27" });
    expect(zeitraumEnde(z)).toBe("2027-08-31");
  });
  it("NRW-Kitajahr beginnt im August", () => {
    const z = loeseZeitraumAuf({ art: "kitajahr", jahr: "2025" }, 8, HEUTE);
    expect(z.von).toBe("2025-08-01");
    expect(zeitraumEnde(z)).toBe("2026-07-31");
  });
  it("Kalenderjahr", () => {
    const z = loeseZeitraumAuf({ art: "kalenderjahr", jahr: "2025" }, 9, HEUTE);
    expect(z).toMatchObject({ von: "2025-01-01", monate: 12, label: "Kalenderjahr 2025" });
  });
  it("Mehrere Jahre, höchstens 36 Monate", () => {
    const z = loeseZeitraumAuf({ art: "mehrjahre", jahr: "2024", bis: "2026" }, 9, HEUTE);
    expect(z).toMatchObject({ von: "2024-01-01", monate: 36, label: "2024–2026" });
    const zu = loeseZeitraumAuf({ art: "mehrjahre", jahr: "2022", bis: "2026" }, 9, HEUTE);
    expect(zu.monate).toBe(MAX_MONATE);
    expect(zu.bisJahr).toBe(2024);
  });
  it("Bis vor Von wird auf ein Jahr begrenzt", () => {
    expect(loeseZeitraumAuf({ art: "mehrjahre", jahr: "2025", bis: "2023" }, 9, HEUTE).monate).toBe(12);
  });
  it("Alte Links mit von/monate bleiben gültig", () => {
    const z = loeseZeitraumAuf({ von: "2026-03-15", monate: "99" }, 9, HEUTE);
    expect(z).toMatchObject({ art: "frei", von: "2026-03-01", monate: MAX_MONATE });
  });
  it("Unsinnige Jahreszahlen fallen auf Vorgaben zurück", () => {
    expect(loeseZeitraumAuf({ art: "kalenderjahr", jahr: "abc" }, 9, HEUTE).jahr).toBe(2026);
    expect(loeseZeitraumAuf({ art: "kalenderjahr", jahr: "1900" }, 9, HEUTE).jahr).toBe(2020);
  });
  it("zeitraumMonate liefert die Monatsersten", () => {
    expect(zeitraumMonate({ von: "2026-11-01", monate: 3 })).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });
});
