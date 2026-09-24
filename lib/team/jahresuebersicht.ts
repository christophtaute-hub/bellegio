/**
 * Team-Jahresübersicht (Januar–Dezember): dieselbe Fallback-Logik wie die SQL-Funktion
 * `team_presence_for_month` (coalesce team_monthly_hours → team.wochenstunden → 0, Ausfallzeit
 * setzt den Monat nur auf 0, wenn sie ihn komplett überdeckt), hier aber für alle 12 Monate auf
 * einmal aus bereits geladenen Zeilen berechnet — statt die RPC zwölfmal aufzurufen.
 */
export type TeamJahresbasis = {
  id: string;
  wochenstunden: number | null;
  eintritt: string | null;
  austritt: string | null;
};

export type MonthlyHoursZeile = { team_id: string; month: string; wochenstunden: number };
export type AusfallzeitZeile = { team_id: string; von: string; bis: string | null };

export type MonatsWert = {
  /** Erster Tag des Monats (YYYY-MM-01). */
  month: string;
  /** null = das Mitglied ist in diesem Monat gar nicht aktiv (vor Eintritt/nach Austritt). */
  wochenstunden: number | null;
  /** true, wenn eine Ausfallzeit den kompletten Monat überdeckt (Wochenstunden dadurch 0). */
  hatVollmonatigeAusfallzeit: boolean;
  /** true, wenn für diesen Monat ein expliziter team_monthly_hours-Wert existiert statt des
   * Fallbacks auf team.wochenstunden. */
  hatEigenenWert: boolean;
  istEintrittsmonat: boolean;
  istAustrittsmonat: boolean;
};

export type TeamJahresZeile = { teamId: string; monate: MonatsWert[] };

function monatsBounds(month: string): { start: string; end: string } {
  const [jahr, m] = month.split("-").map(Number);
  const start = month;
  const end = new Date(Date.UTC(jahr, m, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function jahresMonate(jahr: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${jahr}-${String(i + 1).padStart(2, "0")}-01`);
}

export function berechneJahresuebersicht(
  team: TeamJahresbasis[],
  monthlyHours: MonthlyHoursZeile[],
  ausfallzeiten: AusfallzeitZeile[],
  jahr: number
): TeamJahresZeile[] {
  const monate = jahresMonate(jahr);
  const hoursByKey = new Map(monthlyHours.map((h) => [`${h.team_id}::${h.month}`, h.wochenstunden]));
  const ausfallzeitenByTeam = new Map<string, AusfallzeitZeile[]>();
  for (const a of ausfallzeiten) {
    const liste = ausfallzeitenByTeam.get(a.team_id);
    if (liste) liste.push(a);
    else ausfallzeitenByTeam.set(a.team_id, [a]);
  }

  return team.map((mitglied) => ({
    teamId: mitglied.id,
    monate: monate.map((month) => {
      const { start, end } = monatsBounds(month);
      const aktiv = mitglied.eintritt !== null && mitglied.eintritt <= end && (mitglied.austritt === null || mitglied.austritt > start);
      if (!aktiv) {
        return {
          month,
          wochenstunden: null,
          hatVollmonatigeAusfallzeit: false,
          hatEigenenWert: false,
          istEintrittsmonat: mitglied.eintritt !== null && mitglied.eintritt >= start && mitglied.eintritt <= end,
          istAustrittsmonat: mitglied.austritt !== null && mitglied.austritt >= start && mitglied.austritt <= end,
        };
      }

      const hatVollmonatigeAusfallzeit = (ausfallzeitenByTeam.get(mitglied.id) ?? []).some(
        (a) => a.von <= start && (a.bis === null || a.bis >= end)
      );
      const eigenerWert = hoursByKey.get(`${mitglied.id}::${month}`);
      const wochenstunden = hatVollmonatigeAusfallzeit ? 0 : (eigenerWert ?? mitglied.wochenstunden ?? 0);

      return {
        month,
        wochenstunden,
        hatVollmonatigeAusfallzeit,
        hatEigenenWert: eigenerWert !== undefined,
        istEintrittsmonat: mitglied.eintritt !== null && mitglied.eintritt >= start && mitglied.eintritt <= end,
        istAustrittsmonat: mitglied.austritt !== null && mitglied.austritt >= start && mitglied.austritt <= end,
      };
    }),
  }));
}

/** Summe der Wochenstunden aller Mitglieder je Monat — für eine "verfügbare Gesamt-VZÄ"-Zeile. */
export function summiereJeMonat(zeilen: TeamJahresZeile[]): number[] {
  if (zeilen.length === 0) return Array.from({ length: 12 }, () => 0);
  return zeilen[0].monate.map((_, i) => zeilen.reduce((sum, z) => sum + (z.monate[i].wochenstunden ?? 0), 0));
}
