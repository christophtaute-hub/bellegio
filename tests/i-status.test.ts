import { describe, expect, it } from "vitest";
import { istStatusAmStichtag } from "@/lib/kinder/i-status";

const k = (von: string | null, bis: string | null, an = true) => ({ hat_behinderung: an, i_status_von: von, i_status_bis: bis });

describe("istStatusAmStichtag", () => {
  it("ohne I-Status nie", () => {
    expect(istStatusAmStichtag(k(null, null, false), "2026-10-01")).toBe(false);
  });
  it("ohne Zeitraum unbefristet", () => {
    expect(istStatusAmStichtag(k(null, null), "2030-01-01")).toBe(true);
  });
  it("Grenzen sind inklusive", () => {
    const kind = k("2026-03-01", "2026-08-31");
    expect(istStatusAmStichtag(kind, "2026-02-28")).toBe(false);
    expect(istStatusAmStichtag(kind, "2026-03-01")).toBe(true);
    expect(istStatusAmStichtag(kind, "2026-08-31")).toBe(true);
    expect(istStatusAmStichtag(kind, "2026-09-01")).toBe(false);
  });
  it("nur Beginn oder nur Ende", () => {
    expect(istStatusAmStichtag(k("2026-03-01", null), "2026-02-01")).toBe(false);
    expect(istStatusAmStichtag(k(null, "2026-03-01"), "2026-04-01")).toBe(false);
  });
});
