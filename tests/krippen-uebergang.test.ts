import { describe, expect, it } from "vitest";
import { krippenUebergangWarnung } from "@/lib/kita-datum";

describe("krippenUebergangWarnung", () => {
  const heute = new Date("2026-09-22T00:00:00Z");

  it("rot, wenn das Kind heute bereits 3 ist", () => {
    expect(krippenUebergangWarnung("2023-06-01", heute)).toBe("rot");
  });

  it("rot, wenn der 3. Geburtstag in den nächsten 3 Monaten liegt", () => {
    expect(krippenUebergangWarnung("2023-11-01", heute)).toBe("rot");
  });

  it("null, wenn der 3. Geburtstag weiter als 3 Monate entfernt ist", () => {
    expect(krippenUebergangWarnung("2024-03-01", heute)).toBeNull();
  });

  it("null für ein Baby", () => {
    expect(krippenUebergangWarnung("2026-01-01", heute)).toBeNull();
  });
});
