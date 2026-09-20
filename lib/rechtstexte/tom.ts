export type TomStatus = "umgesetzt" | "mit Produktivstart" | "Betreiber ergänzt";

export type TomMassnahme = { titel: string; text: string; status: TomStatus };
export type TomGruppe = { titel: string; massnahmen: TomMassnahme[] };

/** Technische und organisatorische Maßnahmen nach Art. 32 DSGVO. Jede Angabe beschreibt, was im Programm
 * tatsächlich umgesetzt ist — was erst mit dem Produktivbetrieb kommt oder vom Betreiber organisatorisch zu ergänzen
 * ist, trägt einen entsprechenden Status. */
export const TOM: TomGruppe[] = [
  {
    titel: "Zugriffskontrolle und Mandantentrennung",
    massnahmen: [
      {
        titel: "Trennung der Kunden auf Datenbankebene",
        text: "Jeder Träger sieht ausschließlich seine eigenen Daten. Die Trennung wird in der Datenbank selbst erzwungen (Row-Level-Security), nicht nur in der Oberfläche.",
        status: "umgesetzt",
      },
      {
        titel: "Rechte je Einrichtung und Bereich",
        text: "Zugriff auf Belegung, Personal, Controlling und Szenario-Rechner lässt sich je Einrichtung in den Stufen „kein Zugriff“, „ansehen“ und „bearbeiten“ vergeben. Die Träger-Administration verwaltet Nutzer und Rechte; wer Rechte vergeben darf, kann nie mehr vergeben, als er selbst hat.",
        status: "umgesetzt",
      },
      {
        titel: "Betreiber ohne Einsicht in Kinder- und Personaldaten",
        text: "Der Betreiberbereich zeigt Kunden, Einrichtungen, Kennzahlen (z. B. Anzahl aktiver Kinder) und Rechnungen — keine Namen oder Einzelangaben zu Kindern und Personal.",
        status: "umgesetzt",
      },
    ],
  },
  {
    titel: "Zugangskontrolle",
    massnahmen: [
      {
        titel: "Passwortregeln",
        text: "Mindestens 10 Zeichen, Sperre offensichtlicher Passwörter. Passwörter werden nicht im Klartext gespeichert (Supabase Auth).",
        status: "umgesetzt",
      },
      {
        titel: "Zwei-Faktor-Anmeldung",
        text: "Jedes Konto kann eine Authenticator-App als zweiten Faktor einrichten; im Betreiberbereich ist der bestätigte Code Pflicht, sobald er eingerichtet ist.",
        status: "umgesetzt",
      },
      {
        titel: "Prüfung auf bekannte Passwort-Leaks",
        text: "Abgleich neuer Passwörter mit Datenbanken bekannter Leaks.",
        status: "mit Produktivstart",
      },
    ],
  },
  {
    titel: "Weitergabekontrolle und Transport",
    massnahmen: [
      {
        titel: "Verschlüsselte Übertragung",
        text: "Zugriff ausschließlich über HTTPS mit HSTS.",
        status: "mit Produktivstart",
      },
      {
        titel: "Schutz vor typischen Web-Angriffen",
        text: "Sicherheits-Header (u. a. Content-Security-Policy, Schutz vor Einbettung in fremde Seiten, MIME-Sniffing-Schutz).",
        status: "umgesetzt",
      },
      {
        titel: "Exporte nur für Berechtigte",
        text: "Excel- und PDF-Exporte sind an dieselben Rechte wie die Ansichten gebunden.",
        status: "umgesetzt",
      },
    ],
  },
  {
    titel: "Eingabekontrolle und Nachvollziehbarkeit",
    massnahmen: [
      {
        titel: "Änderungsprotokoll",
        text: "Änderungen an Kindern und Personal werden mit Zeitpunkt und Nutzer festgehalten.",
        status: "umgesetzt",
      },
      {
        titel: "Löschprotokoll",
        text: "Löschen und Anonymisieren wird ohne personenbezogene Inhalte protokolliert (wer, wann, welcher Datensatz).",
        status: "umgesetzt",
      },
      {
        titel: "Unveränderliche Rechnungen",
        text: "Freigegebene Rechnungen lassen sich nicht mehr ändern, Korrekturen laufen über Storno und Gutschrift.",
        status: "umgesetzt",
      },
    ],
  },
  {
    titel: "Verfügbarkeit und Belastbarkeit",
    massnahmen: [
      {
        titel: "Datensicherung",
        text: "Regelmäßige Sicherungen der Datenbank durch den Datenbank-Anbieter, mit Wiederherstellung zu einem beliebigen Zeitpunkt.",
        status: "mit Produktivstart",
      },
      {
        titel: "Getrennte Test- und Produktivumgebung",
        text: "Testdaten und Testkonten liegen nicht in der Produktivdatenbank.",
        status: "mit Produktivstart",
      },
      {
        titel: "Überwachung",
        text: "Fehler-Monitoring und Erreichbarkeitsprüfung.",
        status: "mit Produktivstart",
      },
    ],
  },
  {
    titel: "Datenminimierung, Betroffenenrechte und Löschung",
    massnahmen: [
      {
        titel: "Auskunft",
        text: "Für jedes Kind und jede Person lässt sich eine Auskunft nach Art. 15 DSGVO als Ausdruck oder Excel erzeugen.",
        status: "umgesetzt",
      },
      {
        titel: "Löschen und Anonymisieren",
        text: "Die Träger-Administration kann ausgetretene Kinder und ausgeschiedenes Personal endgültig löschen oder anonymisieren; eine einstellbare Löschfrist erinnert an fällige Einträge.",
        status: "umgesetzt",
      },
      {
        titel: "Datenstandort",
        text: "Die Datenbank liegt in einem Rechenzentrum in Frankfurt am Main.",
        status: "umgesetzt",
      },
    ],
  },
  {
    titel: "Organisatorische Maßnahmen des Betreibers",
    massnahmen: [
      { titel: "Verpflichtung auf Vertraulichkeit", text: "Mitarbeitende und Dienstleister mit Datenzugriff werden auf Vertraulichkeit verpflichtet.", status: "Betreiber ergänzt" },
      { titel: "Umgang mit Datenschutzverletzungen", text: "Meldeweg und Fristen bei Datenpannen (Art. 33 DSGVO).", status: "Betreiber ergänzt" },
      { titel: "Datenschutzschulung", text: "Schulung der Personen mit Zugriff auf Kundendaten.", status: "Betreiber ergänzt" },
    ],
  },
];
