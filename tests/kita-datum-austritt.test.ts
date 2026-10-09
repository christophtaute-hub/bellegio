import { describe, expect, it } from "vitest";
import { vorgeschlagenerAustritt } from "@/lib/kita-datum";

describe("vorgeschlagenerAustritt", () => {
  it("Kindergarten-Kind: 6. Geburtstag, auf den nächsten 1. September gerundet", () => {
    const heute = new Date("2026-01-01T00:00:00Z");
    // 6. Geburtstag am 2032-03-01 -> nächster 1. September ist derselbe Jahrgang
    expect(vorgeschlagenerAustritt("2026-03-01", false, heute)).toBe("2032-08-31");
  });

  it("Krippe-Kind: 3. Geburtstag, auf den nächsten 1. September gerundet", () => {
    const heute = new Date("2026-01-01T00:00:00Z");
    expect(vorgeschlagenerAustritt("2026-03-01", true, heute)).toBe("2029-08-31");
  });

  it("Geburtstag liegt genau auf dem 1. September: kein zusätzliches Jahr", () => {
    const heute = new Date("2020-01-01T00:00:00Z");
    expect(vorgeschlagenerAustritt("2020-09-01", false, heute)).toBe("2026-08-31");
  });

  it("rechnerisches Datum liegt bereits in der Vergangenheit: rückt auf den nächsten künftigen Übergang vor", () => {
    // Geburtsdatum so gewählt, dass der reguläre 6.-Geburtstag-Übergang schon vorbei ist,
    // das Kind laut Status aber weiterhin aktiv ist.
    const heute = new Date("2026-09-27T00:00:00Z");
    expect(vorgeschlagenerAustritt("2019-01-01", false, heute)).toBe("2027-08-31");
  });

  it("liefert nie ein Datum in der Vergangenheit oder am heutigen Tag", () => {
    const heute = new Date("2026-09-27T00:00:00Z");
    const ergebnis = vorgeschlagenerAustritt("2023-08-15", true, heute);
    expect(new Date(`${ergebnis}T00:00:00Z`).getTime()).toBeGreaterThan(heute.getTime());
  });
});
