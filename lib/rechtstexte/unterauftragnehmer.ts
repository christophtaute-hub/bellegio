export type Unterauftragnehmer = {
  name: string;
  leistung: string;
  standort: string;
  /** true = wird eingesetzt; false = vorgesehen, aber noch nicht festgelegt. */
  eingesetzt: boolean;
  hinweis?: string;
};

/** Stand der Unterauftragnehmer. Was noch nicht entschieden ist, steht ausdrücklich als „nicht festgelegt“ da —
 * die Liste wird vor dem Produktivstart vervollständigt. */
export const UNTERAUFTRAGNEHMER: Unterauftragnehmer[] = [
  {
    name: "Supabase",
    leistung: "Datenbank und Anmeldung (Authentifizierung) — hier liegen alle Anwendungsdaten",
    standort: "Rechenzentrum in Frankfurt am Main (AWS eu-central-1)",
    eingesetzt: true,
    hinweis: "Anbieter ist Supabase Inc. (USA). Für Drittlandbezug sind Standardvertragsklauseln bzw. das EU-US Data Privacy Framework zu prüfen und im Auftragsverarbeitungsvertrag mit dem Anbieter zu regeln.",
  },
  {
    name: "Hosting der Anwendung",
    leistung: "Auslieferung der Webanwendung (Server, HTTPS)",
    standort: "EU-Region",
    eingesetzt: false,
    hinweis: "Anbieter noch nicht festgelegt.",
  },
  {
    name: "E-Mail-Versand",
    leistung: "Einladungen und Passwort-Zurücksetzen",
    standort: "EU",
    eingesetzt: false,
    hinweis: "Anbieter noch nicht festgelegt. Bis dahin nutzt die Anwendung den Standardversand von Supabase.",
  },
  {
    name: "Fehler-Monitoring",
    leistung: "Erkennen und Beheben technischer Fehler",
    standort: "EU",
    eingesetzt: false,
    hinweis: "Optional, Anbieter noch nicht festgelegt. Personenbezogene Inhalte werden nicht übertragen.",
  },
];
