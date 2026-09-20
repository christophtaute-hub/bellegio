import type { KindFeld } from "@/lib/import/kinder";

export type VorlagenBlatt = { name: string; zeilen: (string | number)[][] };

export type VorlagenHinweise = {
  gruppen: string[];
  baender: string[];
};

/** Inhalt der Excel-Vorlage für Kinder — bundeslandabhängig (Gewichtung nur in Bayern). */
export function kinderVorlage(bundeslandCode: string, hinweise: VorlagenHinweise): VorlagenBlatt[] {
  const bayern = bundeslandCode === "by";
  const gruppe = hinweise.gruppen[0] ?? "Gruppe 1";
  const band = hinweise.baender[Math.min(5, hinweise.baender.length - 1)] ?? "";

  const kopf: string[] = [
    "Vorname",
    "Nachname",
    "Geburtsdatum",
    "Geschlecht",
    "Gruppe",
    "Status",
    "Eintritt",
    "Austritt",
    "Buchungszeit",
    "I-Status",
    "Wohnort",
    "Notizen",
    ...(bayern ? ["Gewichtung"] : []),
  ];
  const beispiel = (werte: Partial<Record<KindFeld | "gewichtung", string>>) =>
    kopf.map((spalte) => {
      const map: Record<string, string> = {
        Vorname: werte.vorname ?? "",
        Nachname: werte.nachname ?? "",
        Geburtsdatum: werte.geburtsdatum ?? "",
        Geschlecht: werte.geschlecht ?? "",
        Gruppe: werte.gruppe ?? "",
        Status: werte.status ?? "",
        Eintritt: werte.eintritt ?? "",
        Austritt: werte.austritt ?? "",
        Buchungszeit: werte.buchungszeit ?? "",
        "I-Status": werte.istatus ?? "",
        Wohnort: werte.wohnort ?? "",
        Notizen: werte.notizen ?? "",
        Gewichtung: werte.gewichtung ?? "",
      };
      return map[spalte];
    });

  const hinweisZeilen: (string | number)[][] = [
    ["So füllst du die Vorlage aus"],
    [],
    ["Pflicht", "Vorname, Nachname, Geburtsdatum (TT.MM.JJJJ), Geschlecht (männlich, weiblich, divers oder keine Angabe)"],
    ["Aktive Kinder", "brauchen zusätzlich Gruppe und Eintritt — ohne Eintrittsdatum zählt ein Kind in keiner Berechnung."],
    ["Nachrücker", "Status „Nachrücker“ mit geplantem Eintritt; die Gruppe ist optional."],
    ["Status", "leer = aktiv (bei vergebener Gruppe) bzw. Nachrücker (bei Eintritt in der Zukunft)"],
    ["I-Status", "ja oder nein (leer = nein)"],
    ["Bereits vorhandene Kinder", "werden erkannt (Name + Geburtsdatum) und übersprungen."],
    [],
    ["Deine Gruppen", hinweise.gruppen.join(", ") || "noch keine angelegt — bitte zuerst unter „Gruppen“ anlegen"],
    ["Mögliche Buchungszeiten", hinweise.baender.join(", ")],
    ...(bayern
      ? [
          [
            "Gewichtung (Bayern)",
            "U3, Ü3, Schulkind, Migration, Integration — mehrere mit Komma trennen. Leer = aus dem Alter abgeleitet.",
          ] as (string | number)[],
        ]
      : []),
  ];

  return [
    {
      name: "Kinder",
      zeilen: [
        kopf,
        beispiel({
          vorname: "Mia",
          nachname: "Beispiel",
          geburtsdatum: "14.03.2022",
          geschlecht: "weiblich",
          gruppe,
          status: "aktiv",
          eintritt: "01.09.2024",
          buchungszeit: band,
          istatus: "nein",
          wohnort: "Musterstadt",
        }),
        beispiel({
          vorname: "Ben",
          nachname: "Beispiel",
          geburtsdatum: "02.11.2023",
          geschlecht: "männlich",
          status: "Nachrücker",
          eintritt: "01.01.2027",
          buchungszeit: band,
          istatus: "nein",
        }),
      ],
    },
    { name: "Hinweise", zeilen: hinweisZeilen },
  ];
}

export function teamVorlage(hinweise: VorlagenHinweise): VorlagenBlatt[] {
  const kopf = ["Vorname", "Nachname", "Rolle", "Kategorie", "Wochenstunden", "Gruppe", "Status", "Eintritt", "Austritt"];
  return [
    {
      name: "Team",
      zeilen: [
        kopf,
        ["Anna", "Beispiel", "Pädagogische Fachkraft (Erzieher/in)", "Fachkraft", 39, hinweise.gruppen[0] ?? "", "aktiv", "01.09.2019", ""],
        ["Tom", "Beispiel", "Pädagogische Ergänzungskraft (Kinderpfleger/in)", "Ergänzungskraft", 30, hinweise.gruppen[0] ?? "", "aktiv", "01.09.2022", ""],
      ],
    },
    {
      name: "Hinweise",
      zeilen: [
        ["So füllst du die Vorlage aus"],
        [],
        ["Pflicht", "Vorname, Nachname, Wochenstunden, sowie Rolle oder Kategorie"],
        ["Kategorie", "Fachkraft, Ergänzungskraft, Assistenzkraft, nicht-pädagogisch, Sprachförderung, Hausmeister, Hauswirtschaft. Leer = aus der Rolle abgeleitet."],
        ["Kategorie zählt", "Sie bestimmt, wie die Person in den Personalschlüssel eingeht (z. B. Fachkraftquote)."],
        ["Gruppe", "optional, muss einer angelegten Gruppe entsprechen"],
        ["Status", "aktiv, inaktiv oder geplant (leer = aktiv)"],
        [],
        ["Deine Gruppen", hinweise.gruppen.join(", ") || "noch keine angelegt"],
      ],
    },
  ];
}
