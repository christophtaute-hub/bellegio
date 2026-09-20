/** Reine Regeln für Löschen und Anonymisieren — spiegeln die Prüfung in den Datenbankfunktionen
 * `kind_datenschutz` und `team_datenschutz` (die Datenbank ist die eigentliche Sperre). */

/** Kinder: ausgetreten (Austritt heute oder früher) — oder nie aktiv gewesen (Nachrücker, geplant).
 * Personal: ausgeschieden oder inaktiv. Aktive Personen und Kinder bleiben unangetastet. */
export function istEntfernbar(status: string, austritt: string | null, heute: string): boolean {
  if (status !== "aktiv") return true;
  return austritt !== null && austritt <= heute;
}

export function istAnonymisiert(art: "kind" | "team", vorname: string | null, nachname: string | null): boolean {
  return art === "kind"
    ? vorname === "Anonym" && nachname === "Kind"
    : vorname === "Anonym" && nachname === "Mitarbeiter";
}

export type LoeschKandidat = {
  id: string;
  art: "kind" | "team";
  name: string;
  austritt: string;
  anonymisiert: boolean;
};

function abzugMonate(datum: string, monate: number): string {
  const [j, m, t] = datum.split("-").map(Number);
  const ziel = new Date(Date.UTC(j, m - 1 - monate, 1));
  const letzterTag = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzterTag));
  return ziel.toISOString().slice(0, 10);
}

/** Einträge, deren Austritt länger als die Löschfrist zurückliegt — als Erinnerung zum Prüfen, nicht zum
 * automatischen Löschen. Bereits anonymisierte Einträge sind erledigt und erscheinen nicht. */
export function ermittleFaellige(kandidaten: LoeschKandidat[], fristMonate: number | null, heute: string): LoeschKandidat[] {
  if (fristMonate === null || fristMonate < 1) return [];
  const grenze = abzugMonate(heute, fristMonate);
  return kandidaten
    .filter((k) => !k.anonymisiert && k.austritt <= grenze)
    .sort((a, b) => a.austritt.localeCompare(b.austritt));
}

export function pruefeLoeschfrist(monate: number | null): string | null {
  if (monate === null) return null;
  if (!Number.isInteger(monate) || monate < 1 || monate > 240) return "Bitte eine ganze Zahl von Monaten zwischen 1 und 240 angeben.";
  return null;
}
