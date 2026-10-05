/** Die Bereiche, für die Rechte je Einrichtung vergeben werden — eine Quelle für Datenbank-Spiegel, Rechteverwaltung und Prüfungen. */
export type Bereich = "belegung" | "personal" | "controlling" | "szenario" | "finanzen" | "gehaelter";
export type Zugriff = "kein_zugriff" | "ansehen" | "bearbeiten";

export const BEREICHE: { key: Bereich; label: string; hinweis: string }[] = [
  { key: "belegung", label: "Kinder & Gruppen", hinweis: "Kinder, Gruppen, Nachrücker, Wechsel" },
  { key: "personal", label: "Personal", hinweis: "Team, Stunden, Ausfallzeiten (ohne Gehälter)" },
  { key: "controlling", label: "Controlling", hinweis: "Zeitverlauf, Kategorisierung, Prüfungsmappe" },
  { key: "szenario", label: "Szenario-Rechner", hinweis: "Was-wäre-wenn und Planung" },
  { key: "finanzen", label: "Finanzübersicht", hinweis: "Fördererlöse, Personalkosten gesamt, Ergebnis" },
  { key: "gehaelter", label: "Einzelgehälter", hinweis: "Vergütung einzelner Mitarbeitender" },
];

export const BEREICH_KEYS: Bereich[] = BEREICHE.map((b) => b.key);

/** Standard der Einrichtungsleitung ohne eigene Einstellung: alles außer Finanzen und Einzelgehälter. Spiegelt
 * app.current_user_zugriff() in der Datenbank. */
export function standardZugriffEinrichtungsleitung(bereich: Bereich): Zugriff {
  return bereich === "finanzen" || bereich === "gehaelter" ? "kein_zugriff" : "bearbeiten";
}
