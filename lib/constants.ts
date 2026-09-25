export const GRUPPENART_LABEL: Record<string, string> = {
  krippe: "Krippe",
  kindergarten: "Kindergarten",
  hort: "Hort",
  altersgemischt: "Altersgemischt",
};

export const KIND_STATUS_LABEL: Record<string, string> = {
  aktiv: "Aktiv",
  nachruecker: "Nachrücker",
  geplant: "Geplant",
};

export const GESCHLECHT_LABEL: Record<string, string> = {
  maennlich: "männlich",
  weiblich: "weiblich",
  divers: "divers",
  keine_angabe: "keine Angabe",
};

/** Kurzform je Gewichtungsfaktor-Code, für schmale Tabellenspalten (z.B. die Sitzplatz-Tabelle in Gruppen) —
 * das volle Label bleibt per Tooltip/title-Attribut erreichbar. */
export const WEIGHTING_FACTOR_KUERZEL: Record<string, string> = {
  u3: "U3",
  ue3_bis_schuleintritt: "Ü3",
  schulkinder: "Schulk.",
  integrationskinder: "Integr.",
  tagespflege: "Hort",
  nicht_deutschsprachig: "MK",
};

export const TEAM_ROLLE_OPTIONS = [
  "Einrichtungsleitung",
  "Stellvertretende Leitung",
  "Pädagogische Fachkraft (Erzieher/in)",
  "Pädagogische Ergänzungskraft (Kinderpfleger/in)",
  "Sozialpädagoge/in",
  "Praktikant/in",
  "FSJ/BFD",
  "Hauswirtschaft/Verwaltung",
  "Sonstige",
] as const;

/** TVöD-SuE-Entgeltgruppen, Kita-relevante Teilmenge (Milestone 29c, siehe tvoed_sue_entgelt). */
export const TVOED_SUE_ENTGELTGRUPPEN = [
  "S3", "S4", "S8a", "S8b", "S9", "S11a", "S11b", "S13", "S15", "S16", "S17", "S18",
] as const;

export const TEAM_STATUS_LABEL: Record<string, string> = {
  aktiv: "Aktiv",
  inaktiv: "Inaktiv",
  geplant: "Geplant",
};

export const TEAM_ROLE_CATEGORY_LABEL: Record<string, string> = {
  fk: "Fachkraft",
  ek: "Ergänzungskraft",
  ak: "Assistenzkraft",
  nicht_paed: "Nicht-pädagogisch",
  sprachfoerderung: "Sprachförderung",
  hausmeister: "Hausmeister",
  hauswirtschaft: "Hauswirtschaftskraft",
};

export const AUSFALLZEIT_ART_LABEL: Record<string, string> = {
  mutterschutz: "Mutterschutz",
  schwangerschaft: "Schwangerschaft (Beschäftigungsverbot)",
  krankheit: "Krankheit",
  sonderurlaub: "Sonderurlaub",
  sonstiges: "Sonstiges",
};

/** Stand der hinterlegten Gesetzeswerte und Rechenwege (Anlagen zu BayKiBiG/AVBayKiBiG, KiTaVO, KiBiz). Bei jeder
 * Prüfung oder Änderung der Werte aktualisieren — der Stand steht in Dokumentation und Prüfungsmappe. */
export const RECHENWERTE_STAND = "September 2026";

export const PLANUNGSHILFE_HINWEIS =
  "Planungshilfe, keine Rechts- oder Behördenauskunft. Die Werte beruhen auf den genannten Quellen; vor Meldungen und Förderanträgen mit dem zuständigen Jugendamt abgleichen.";
