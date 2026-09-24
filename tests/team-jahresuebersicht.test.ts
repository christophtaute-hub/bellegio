import { describe, expect, it } from "vitest";
import { berechneJahresuebersicht, summiereJeMonat } from "@/lib/team/jahresuebersicht";

describe("berechneJahresuebersicht", () => {
  it("nutzt team.wochenstunden als Fallback, wenn kein Eintrag in team_monthly_hours existiert", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null }],
      [],
      [],
      2026
    );
    expect(zeile.monate).toHaveLength(12);
    expect(zeile.monate[0]).toMatchObject({ wochenstunden: 30, hatEigenenWert: false, hatVollmonatigeAusfallzeit: false });
  });

  it("bevorzugt einen expliziten team_monthly_hours-Wert vor dem Fallback", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null }],
      [{ team_id: "t1", month: "2026-03-01", wochenstunden: 20 }],
      [],
      2026
    );
    expect(zeile.monate[2].wochenstunden).toBe(20);
    expect(zeile.monate[2].hatEigenenWert).toBe(true);
    expect(zeile.monate[1].wochenstunden).toBe(30);
  });

  it("setzt Wochenstunden auf 0, wenn eine Ausfallzeit den ganzen Monat überdeckt", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null }],
      [],
      [{ team_id: "t1", von: "2026-06-01", bis: "2026-06-30" }],
      2026
    );
    expect(zeile.monate[5]).toMatchObject({ wochenstunden: 0, hatVollmonatigeAusfallzeit: true });
    expect(zeile.monate[4].hatVollmonatigeAusfallzeit).toBe(false);
  });

  it("überdeckt eine Ausfallzeit nur teilweise den Monat, bleibt der reguläre Wert bestehen", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null }],
      [],
      [{ team_id: "t1", von: "2026-06-15", bis: "2026-06-30" }],
      2026
    );
    expect(zeile.monate[5]).toMatchObject({ wochenstunden: 30, hatVollmonatigeAusfallzeit: false });
  });

  it("markiert Monate vor Eintritt/nach Austritt als nicht aktiv (null)", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2026-04-01", austritt: "2026-09-30" }],
      [],
      [],
      2026
    );
    expect(zeile.monate[2].wochenstunden).toBeNull();
    expect(zeile.monate[3]).toMatchObject({ wochenstunden: 30, istEintrittsmonat: true });
    expect(zeile.monate[8]).toMatchObject({ wochenstunden: 30, istAustrittsmonat: true });
    expect(zeile.monate[9].wochenstunden).toBeNull();
  });

  it("eine offene Ausfallzeit (bis=null) deckt auch spätere Monate ab", () => {
    const [zeile] = berechneJahresuebersicht(
      [{ id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null }],
      [],
      [{ team_id: "t1", von: "2026-05-01", bis: null }],
      2026
    );
    expect(zeile.monate[4].hatVollmonatigeAusfallzeit).toBe(true);
    expect(zeile.monate[11].hatVollmonatigeAusfallzeit).toBe(true);
  });
});

describe("summiereJeMonat", () => {
  it("summiert die Wochenstunden aller Mitglieder je Monat, ignoriert nicht-aktive (null)", () => {
    const zeilen = berechneJahresuebersicht(
      [
        { id: "t1", wochenstunden: 30, eintritt: "2020-01-01", austritt: null },
        { id: "t2", wochenstunden: 20, eintritt: "2026-07-01", austritt: null },
      ],
      [],
      [],
      2026
    );
    const summen = summiereJeMonat(zeilen);
    expect(summen[0]).toBe(30);
    expect(summen[6]).toBe(50);
  });

  it("leeres Team liefert 12 Nullen", () => {
    expect(summiereJeMonat([])).toEqual(Array.from({ length: 12 }, () => 0));
  });
});
