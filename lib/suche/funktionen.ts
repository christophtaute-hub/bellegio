import type { Bereich } from "@/lib/server/current-user-role";

export type AppFunktion = {
  label: string;
  href: string;
  /** Zusätzliche Suchbegriffe (Kleinschreibung egal). */
  schlagworte: string[];
  /** Nur sichtbar, wenn der Nutzer in der aktiven Einrichtung mindestens "ansehen" für diesen Bereich hat. */
  bereich?: Bereich;
  /** Nur sichtbar, wenn der Nutzer in der aktiven Einrichtung "bearbeiten" für diesen Bereich hat. */
  bearbeiten?: boolean;
  nurBetreiber?: boolean;
  nurTraegerAdmin?: boolean;
};

export const APP_FUNKTIONEN: AppFunktion[] = [
  { label: "Dashboard", href: "/dashboard", schlagworte: ["übersicht", "start", "aufgaben", "kennzahlen"] },
  { label: "Gruppen", href: "/gruppen", schlagworte: ["sitzplätze", "belegung", "plätze"], bereich: "belegung" },
  { label: "Belegungs-Vorschau", href: "/gruppen/vorschau", schlagworte: ["frei werdende plätze", "nachrücker", "warteliste"], bereich: "belegung" },
  { label: "Kinder", href: "/kinder", schlagworte: ["liste", "kinderliste", "export"], bereich: "belegung" },
  { label: "Kind anlegen", href: "/kinder/neu", schlagworte: ["neues kind", "aufnahme", "nachrücker"], bereich: "belegung", bearbeiten: true },
  { label: "Kinder aus Excel importieren", href: "/kinder/import", schlagworte: ["import", "upload", "csv"], bereich: "belegung", bearbeiten: true },
  { label: "Team", href: "/team", schlagworte: ["personal", "mitarbeiter", "fachkräfte"], bereich: "personal" },
  { label: "Personal anlegen", href: "/team/neu", schlagworte: ["mitarbeiter anlegen", "neue fachkraft"], bereich: "personal", bearbeiten: true },
  { label: "Personal aus Excel importieren", href: "/team/import", schlagworte: ["import", "upload"], bereich: "personal", bearbeiten: true },
  { label: "Team-Jahresübersicht", href: "/team/jahresuebersicht", schlagworte: ["monatsstunden", "wochenstunden", "ausfallzeiten"], bereich: "personal" },
  { label: "Controlling", href: "/controlling", schlagworte: ["forecast", "kennzahlen", "fördererlöse", "personalkosten", "ergebnis", "kategorisierung"], bereich: "controlling" },
  { label: "Prüfungsmappe", href: "/controlling/mappe", schlagworte: ["meldung", "export", "pdf", "nachweis"], bereich: "controlling" },
  { label: "Planung (Szenario-Rechner)", href: "/szenario", schlagworte: ["simulation", "was wäre wenn", "personal", "kosten"], bereich: "szenario" },
  { label: "Rechtsgrundlagen", href: "/einstellungen/rechtsgrundlagen", schlagworte: ["gesetz", "formel", "berechnung", "erklärung", "hilfe", "dokumentation"] },
  { label: "Einrichtung (Einstellungen)", href: "/einstellungen", schlagworte: ["grunddaten", "personalbemessung", "vollzeit", "förderbetrag", "lohnnebenkosten"] },
  { label: "Nutzer & Rechte", href: "/einstellungen/nutzer", schlagworte: ["nutzer anlegen", "rolle", "berechtigung", "einladen", "sperren", "passwort"] },
  { label: "Mein Profil", href: "/einstellungen/profil", schlagworte: ["passwort ändern", "name", "zwei-faktor", "mfa"] },
  { label: "Meine Einrichtungen", href: "/einrichtung-auswahl", schlagworte: ["wechseln", "einrichtung wechseln", "übersicht", "archivieren", "kostenstelle", "cluster"] },
  { label: "Neue Einrichtung anlegen", href: "/einrichtung-auswahl/neu", schlagworte: ["einrichtung", "standort"], nurTraegerAdmin: true },
  { label: "Abrechnung (Betreiber)", href: "/admin", schlagworte: ["rechnungen", "einnahmen", "umsatz"], nurBetreiber: true },
  { label: "Datenschutz", href: "/datenschutz", schlagworte: ["dsgvo", "auskunft", "löschen"] },
  { label: "Impressum", href: "/impressum", schlagworte: ["anbieter"] },
];

function normalisiere(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Filtert den Funktionsindex nach Tokens (UND): jedes Wort muss im Label oder in den Schlagworten vorkommen. */
export function filtereFunktionen(funktionen: AppFunktion[], tokens: string[]): AppFunktion[] {
  if (tokens.length === 0) return [];
  const gesucht = tokens.map(normalisiere);
  return funktionen.filter((f) => {
    const heu = normalisiere([f.label, ...f.schlagworte].join(" "));
    return gesucht.every((t) => heu.includes(t));
  });
}
