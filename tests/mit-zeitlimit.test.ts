import { describe, expect, it } from "vitest";
import { mitZeitlimit, ZeitlimitFehler } from "@/lib/supabase/mit-zeitlimit";

describe("mitZeitlimit", () => {
  it("gibt den Wert zurück, wenn die Promise rechtzeitig erfüllt wird", async () => {
    const wert = await mitZeitlimit(Promise.resolve("ok"), 50);
    expect(wert).toBe("ok");
  });

  it("reicht eine Ablehnung der ursprünglichen Promise durch", async () => {
    await expect(mitZeitlimit(Promise.reject(new Error("kaputt")), 50)).rejects.toThrow("kaputt");
  });

  it("lehnt mit ZeitlimitFehler ab, wenn die Promise nie erfüllt wird", async () => {
    const haengtEwig = new Promise(() => {});
    await expect(mitZeitlimit(haengtEwig, 20)).rejects.toBeInstanceOf(ZeitlimitFehler);
  });
});
