import { describe, expect, it } from "vitest";
import { bewerteZusage } from "@/lib/steuerung/zusage";
import type { GruppenVerlauf } from "@/lib/steuerung/handlungen";

const gruppe = (modell: GruppenVerlauf["modell"], monate: [string, number, "gruen" | "gelb" | "rot"][], belastbar = true): GruppenVerlauf => ({
  gruppeId: "g",
  name: "Sterne",
  belastbar,
  modell,
  monate: monate.map(([monat, belegt, ampel]) => ({ monat, ampel, istStunden: 0, sollStunden: 0, belegt, sollplaetze: 10 })),
});
const ok = { "2026-10-01": "gruen", "2026-11-01": "gruen", "2026-12-01": "rot" } as const;

describe("bewerteZusage", () => {
  it("Platz frei und Personal reicht: Ja", () => {
    const z = bewerteZusage(gruppe("bw", [["2026-10-01", 9, "gruen"]]), ok, "2026-10-01");
    expect(z).toMatchObject({ art: "ja", text: "Ja — 1 Platz frei" });
  });
  it("Gruppe voll, später ein Platz frei", () => {
    const z = bewerteZusage(gruppe("bw", [["2026-10-01", 10, "gruen"], ["2026-11-01", 9, "gruen"]]), ok, "2026-10-01");
    expect(z).toMatchObject({ art: "spaeter", ab: "2026-11-01" });
    expect(z.text).toContain("November 2026");
  });
  it("Platz da, aber Personal fehlt in diesem Monat", () => {
    const z = bewerteZusage(gruppe("nrw", [["2026-10-01", 10, "gruen"], ["2026-12-01", 8, "rot"]]), ok, "2026-10-01");
    expect(z.art).toBe("personal");
  });
  it("Bayern: die Ampel der Einrichtung zählt, nicht die der Gruppe", () => {
    const z = bewerteZusage(gruppe("bayern", [["2026-12-01", 8, "gruen"]]), ok, "2026-10-01");
    expect(z.art).toBe("personal");
  });
  it("Kein Platz in Sicht", () => {
    expect(bewerteZusage(gruppe("bw", [["2026-10-01", 10, "gruen"]]), ok, "2026-10-01").art).toBe("nein");
  });
});
