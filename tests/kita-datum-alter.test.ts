import { describe, expect, it } from "vitest";
import { formatAlter, parseIsoDate } from "@/lib/kita-datum";

const am = (iso: string) => parseIsoDate(iso);

describe("formatAlter", () => {
  it("Beispiel aus der Anforderung: 14.03.2022 → 4 Jahre 7 Monate (Oktober 2026)", () => {
    expect(formatAlter("2022-03-14", am("2026-10-16"))).toBe("4 Jahre 7 Monate");
  });
  it("Geburtstag heute: volle Jahre, keine Monate", () => {
    expect(formatAlter("2022-10-16", am("2026-10-16"))).toBe("4 Jahre");
  });
  it("einen Tag vor dem Monatstag ist der Monat noch nicht voll", () => {
    expect(formatAlter("2022-03-17", am("2026-10-16"))).toBe("4 Jahre 6 Monate");
  });
  it("Singular für 1 Jahr und 1 Monat, unter einem Jahr nur Monate", () => {
    expect(formatAlter("2025-09-10", am("2026-10-16"))).toBe("1 Jahr 1 Monat");
    expect(formatAlter("2026-02-01", am("2026-10-16"))).toBe("8 Monate");
    expect(formatAlter("2026-10-01", am("2026-10-16"))).toBe("0 Monate");
  });
  it("Geburt am 31. gilt im kürzeren Monat am Monatsende als voll; 29.02. in Nicht-Schaltjahren", () => {
    expect(formatAlter("2024-08-31", am("2026-10-30"))).toBe("2 Jahre 1 Monat");
    expect(formatAlter("2024-02-29", am("2026-02-28"))).toBe("2 Jahre");
  });
});
