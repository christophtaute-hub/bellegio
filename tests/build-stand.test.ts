import { describe, expect, it } from "vitest";
import { formatBuildStand } from "@/lib/build-stand";

describe("Build-Stand", () => {
  it("zeigt Hash und Zeitpunkt (UTC)", () => {
    expect(formatBuildStand({ stand: "abc1234", zeit: "2026-10-24T10:15:00.000Z" })).toBe("abc1234, gebaut am 24.10.2026 um 10:15 Uhr (UTC)");
  });
  it("fällt ohne oder mit ungültigem Zeitpunkt auf den Stand zurück", () => {
    expect(formatBuildStand({ stand: "abc1234", zeit: null })).toBe("abc1234");
    expect(formatBuildStand({ stand: "abc1234", zeit: "kein Datum" })).toBe("abc1234");
  });
});
