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
