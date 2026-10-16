import { describe, expect, it } from "vitest";
import { berechneBelegungAmpel } from "@/lib/steuerung/belegung-ampel";
import type { VorschauGruppe, VorschauKind } from "@/lib/belegung/vorschau";

const gruppe: VorschauGruppe = { id: "g", name: "Gruppe", gruppenart: "kindergarten", sollplatze: 20 };
let zaehler = 0;
function kind(partial: Partial<VorschauKind>): VorschauKind {
  zaehler += 1;
  return {
    id: `k${zaehler}`,
    vorname: "Kind",
    nachname: String(zaehler),
    geburtsdatum: "2022-01-01",
    geschlecht: "weiblich",
    status: "aktiv",
    gruppeId: "g",
    eintritt: "2025-09-01",
    austritt: "2029-08-31",
    wohnort: null,
    ...partial,
  };
}
const viele = (n: number, partial: Partial<VorschauKind> = {}) => Array.from({ length: n }, () => kind(partial));

describe("berechneBelegungAmpel", () => {
  it("voll belegt und nichts absehbar: grün", () => {
    const r = berechneBelegungAmpel([gruppe], viele(20), "2026-10-16");
    expect(r.ampel).toBe("gruen");
    expect(r.satz).toContain("Voll belegt");
  });

  it("jetzt unter 90 %: rot mit Prozent", () => {
    const r = berechneBelegungAmpel([gruppe], viele(17), "2026-10-16");
    expect(r.ampel).toBe("rot");
    expect(r.satz).toBe("Jetzt kritisch: 3 freie Plätze (85 % belegt).");
  });

  it("in 2 Monaten unter 90 %: rot mit Datum", () => {
    const kinder = [...viele(14), ...viele(6, { austritt: "2026-12-31" })];
    const r = berechneBelegungAmpel([gruppe], kinder, "2026-10-16");
    expect(r.ampel).toBe("rot");
    expect(r.satz).toBe("Ab 01.01.2027 kritisch: 6 freie Plätze.");
    expect(r.ausloeserMonat).toBe("2027-01-01");
  });

  it("erst in 6 Monaten Plätze frei: gelb", () => {
    const kinder = [...viele(16), ...viele(4, { austritt: "2027-03-31" })];
    const r = berechneBelegungAmpel([gruppe], kinder, "2026-10-16");
    expect(r.ampel).toBe("gelb");
    expect(r.satz).toBe("Ab 01.04.2027 werden Plätze frei: 4 freie Plätze.");
  });

  it("geplante Nachrücker gleichen den Austritt aus", () => {
    const kinder = [...viele(16), ...viele(4, { austritt: "2027-03-31" }), ...viele(4, { status: "nachruecker", eintritt: "2027-04-01" })];
    expect(berechneBelegungAmpel([gruppe], kinder, "2026-10-16").ampel).toBe("gruen");
  });

  it("überbelegt: rot", () => {
    const r = berechneBelegungAmpel([gruppe], viele(22), "2026-10-16");
    expect(r.ampel).toBe("rot");
    expect(r.satz).toContain("überbelegt: 2 Kinder mehr als Plätze");
  });

  it("ohne Gruppen: grün mit Hinweis", () => {
    expect(berechneBelegungAmpel([], [], "2026-10-16").satz).toBe("Noch keine Gruppen angelegt.");
  });
});

describe("geplante Nachrücker über der Platzzahl", () => {
  it("ist nur gelb, nicht rot — rot gilt für tatsächlich anwesende Kinder", () => {
    const kinder = [...viele(20), ...viele(1, { status: "nachruecker", eintritt: "2026-11-01" })];
    const r = berechneBelegungAmpel([gruppe], kinder, "2026-10-16");
    expect(r.ampel).toBe("gelb");
    expect(r.satz).toBe("Ab 01.11.2026 mehr Kinder eingeplant als Plätze: 1.");
  });
});
