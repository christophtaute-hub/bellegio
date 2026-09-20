import { describe, expect, it } from "vitest";
import { ermittleFaellige, istAnonymisiert, istEntfernbar, pruefeLoeschfrist, type LoeschKandidat } from "@/lib/datenschutz/loeschfrist";

const heute = "2026-09-20";
const kandidat = (t: Partial<LoeschKandidat>): LoeschKandidat => ({
  id: "x",
  art: "kind",
  name: "Kind",
  austritt: "2025-01-01",
  anonymisiert: false,
  ...t,
});

describe("Löschen und Anonymisieren: wer darf entfernt werden", () => {
  it("aktive Personen ohne Austritt sind gesperrt", () => {
    expect(istEntfernbar("aktiv", null, heute)).toBe(false);
  });

  it("aktive Personen mit Austritt in der Zukunft sind gesperrt, heute oder früher erlaubt", () => {
    expect(istEntfernbar("aktiv", "2026-09-21", heute)).toBe(false);
    expect(istEntfernbar("aktiv", "2026-09-20", heute)).toBe(true);
    expect(istEntfernbar("aktiv", "2025-08-31", heute)).toBe(true);
  });

  it("Nachrücker, geplante und inaktive Einträge sind erlaubt", () => {
    expect(istEntfernbar("nachruecker", null, heute)).toBe(true);
    expect(istEntfernbar("geplant", null, heute)).toBe(true);
    expect(istEntfernbar("inaktiv", null, heute)).toBe(true);
  });

  it("erkennt anonymisierte Einträge", () => {
    expect(istAnonymisiert("kind", "Anonym", "Kind")).toBe(true);
    expect(istAnonymisiert("team", "Anonym", "Mitarbeiter")).toBe(true);
    expect(istAnonymisiert("kind", "Mia", "Muster")).toBe(false);
    expect(istAnonymisiert("team", "Anonym", "Kind")).toBe(false);
  });
});

describe("Löschfrist als Erinnerung", () => {
  const liste = [
    kandidat({ id: "a", austritt: "2024-09-19" }), // mehr als 24 Monate her
    kandidat({ id: "b", austritt: "2024-09-20" }), // genau 24 Monate
    kandidat({ id: "c", austritt: "2024-09-21" }), // knapp weniger
    kandidat({ id: "d", austritt: "2020-01-01", anonymisiert: true }),
  ];

  it("liefert Einträge, deren Austritt die Frist erreicht hat, ältester zuerst", () => {
    expect(ermittleFaellige(liste, 24, heute).map((k) => k.id)).toEqual(["a", "b"]);
  });

  it("überspringt bereits anonymisierte Einträge", () => {
    expect(ermittleFaellige(liste, 24, heute).some((k) => k.id === "d")).toBe(false);
  });

  it("ohne Frist gibt es keine Erinnerung", () => {
    expect(ermittleFaellige(liste, null, heute)).toEqual([]);
  });

  it("rechnet am Monatsende richtig (31.03. minus 1 Monat = 28.02.)", () => {
    const l = [kandidat({ id: "e", austritt: "2026-02-28" }), kandidat({ id: "f", austritt: "2026-03-01" })];
    expect(ermittleFaellige(l, 1, "2026-03-31").map((k) => k.id)).toEqual(["e"]);
  });

  it("prüft die Eingabe der Frist", () => {
    expect(pruefeLoeschfrist(null)).toBeNull();
    expect(pruefeLoeschfrist(12)).toBeNull();
    expect(pruefeLoeschfrist(0)).toMatch(/1 und 240/);
    expect(pruefeLoeschfrist(241)).toMatch(/1 und 240/);
    expect(pruefeLoeschfrist(6.5)).toMatch(/ganze Zahl/);
  });
});
