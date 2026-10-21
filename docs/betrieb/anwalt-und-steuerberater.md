# Briefing für Anwalt und Steuerberater

Stand: 07.10.2026. Alle Rechtstexte in Bellegio sind **Entwürfe, die ich (Claude) geschrieben habe**. Sie ersetzen keine rechtliche Prüfung. Bitte alles unten als Fragen verstehen, nicht als Aussagen.

## Das Produkt in drei Sätzen

Bellegio ist eine Webanwendung (Planungshilfe) für Kindertageseinrichtungen: Belegung, Personalschlüssel, Fördererlöse und Meldewesen je Bundesland (Bayern, Baden-Württemberg, Nordrhein-Westfalen). Träger und Einrichtungen speichern darin Kinder- und Mitarbeiterdaten, darunter **I-Status** (Hinweis auf Behinderung/drohende Behinderung = Gesundheitsdaten, Art. 9 DSGVO). Bellegio ist der **Auftragsverarbeiter**, der Träger der Verantwortliche. Betreiber: Christoph Taute Akademie (Krusauer Straße 36, 38302 Wolfenbüttel); Hosting bei Hostinger, Datenbank bei Supabase (Rechenzentrum Frankfurt).

## Texte zur Prüfung (im Repository und auf der Website)

| Text | Datei / Adresse |
| --- | --- |
| Impressum | `app/impressum/page.tsx` · /impressum |
| Datenschutzerklärung | `app/datenschutz/page.tsx` · /datenschutz |
| AGB | `app/agb/page.tsx` · /agb |
| Auftragsverarbeitungsvertrag (Art. 28) | `app/avv/page.tsx` · /avv |
| Technische und organisatorische Maßnahmen | `app/tom/page.tsx` · /tom |
| Unterauftragnehmer | `app/unterauftragnehmer/page.tsx` · /unterauftragnehmer |
| Löschkonzept und Löschfristen | Einstellungen → Datenschutz (nur Träger-Administration), Beschreibung in Datenschutzerklärung und AVV |
| Hinweis „Planungshilfe, keine Rechts- oder Behördenauskunft“ | `lib/constants.ts` (`PLANUNGSHILFE_HINWEIS`), Controlling, Prüfungsmappe, Rechtsgrundlagen |

## Fragen an den Anwalt / Datenschutzbeauftragten

1. **Haftung für Rechenergebnisse.** Die Anwendung berechnet Anstellungsschlüssel, Personalbedarf und Fördererlöse nach Landesrecht (Quellen und Stand stehen unter Einstellungen → Rechtsgrundlagen). Reicht der Hinweis „Planungshilfe, keine Rechts- oder Behördenauskunft“ plus Haftungsbegrenzung in den AGB? Wie sollte der Zuwendungsbescheid als maßgeblich benannt werden?
2. **Vorläufige Werte.** Für 2027 sind Werte der Bayern-Reform vorläufig hinterlegt (Qualitätsbonus; Basiswert fortgeschrieben). Genügt die Kennzeichnung im Controlling, oder braucht es einen Haftungsausschluss je Zahl?
3. **Gesundheitsdaten.** Ist für den I-Status (nur ein Ja/Nein-Merkmal je Kind) eine **Datenschutz-Folgenabschätzung** nötig? Wer führt sie durch — Träger oder Bellegio? Reicht der Auftragsverarbeitungsvertrag, oder braucht der Träger zusätzlich eine Einwilligung der Eltern?
4. **Rolle und Verträge.** Passt die Konstruktion Bellegio = Auftragsverarbeiter, Träger = Verantwortlicher? Sind AVV und TOM vollständig (insbesondere Löschfristen: Kinder nach Austritt, Personal nach Ausscheiden, Audit-Protokolle pseudonymisiert)?
5. **Unterauftragnehmer und Drittländer.** Supabase und Hostinger: Genügen deren Standard-AVV und der Serverstandort Frankfurt? Ist die Mail über das Hostinger-Postfach unproblematisch? Welche Angaben gehören in die Unterauftragnehmer-Liste?
6. **Öffentliche und kirchliche Träger.** Gelten für sie abweichende Anforderungen (z. B. kirchliches Datenschutzrecht, Vergaberecht, Barrierefreiheit)?
7. **AGB-Formulierungen:**
   - Leistungsbeschreibung: „für die jeweils hinterlegten Bundesländer (derzeit Bayern, Baden-Württemberg und Nordrhein-Westfalen)“ — angemessen, wenn Länder später dazukommen?
   - Preise je Einrichtung plus gestaffelt je Kind und Monat, Laufzeit, Kündigung, Testphase: Was ist üblich und zulässig? (Zahlen legt Christoph fest, siehe go-live-checkliste.)
   - Verfügbarkeit und Support ohne feste Zusage (Einzelentwickler): wie formulieren?
8. **Demo-Anfrage-Formular auf der Startseite** (Name, Organisation, Bundesland, E-Mail, Nachricht): reicht der Datenschutz-Abschnitt, und wie lange darf gespeichert werden?
9. **Demo-Zugang** mit Beispieldaten: Hinweis für Nutzer, keine echten Namen einzutragen — ausreichend?
10. **Impressum:** Rechtsträger „Christoph Taute Akademie“; Steuernummer/USt-IdNr. fehlt noch. Gewerbeanmeldung und Rechtsform bitte bestätigen.

## Fragen an den Steuerberater

1. **Rechtsträger und Unternehmensform:** Läuft das Angebot unter „Christoph Taute Akademie“ (Einzelunternehmen?) oder einer anderen Form (früher war eine GbR genannt)? Gewerbeanmeldung vorhanden/nötig?
2. **Umsatzsteuer:** Kleinunternehmerregelung (§ 19 UStG) oder Regelbesteuerung (19 %)? Die Rechnungsvorlage kann beides (Hinweis „Befreiung nach § 19 UStG“ ist als Feld vorgesehen). Besonderheiten bei öffentlichen oder gemeinnützigen Trägern?
3. **Rechnungsvorlage:** Sind die Pflichtangaben nach § 14 UStG vollständig (Aussteller/Empfänger, Steuernummer bzw. USt-IdNr., Datum, fortlaufende Nummer im Format `JJJJ-0001`, Leistungsbeschreibung und -zeitraum, Netto, Steuersatz, Steuerbetrag)? Reicht die PDF-Erzeugung über den Browserdruck?
4. **E-Rechnung:** Ab wann muss Bellegio selbst im B2B E-Rechnungen (XRechnung/ZUGFeRD) ausstellen? Das Datenmodell ist strukturiert genug für einen späteren Export; Priorität klären.
5. **Abrechnungszeitraum:** Rechnung im Folgemonat für den Leistungsmonat oder im Voraus? Maßgebliche Zeitbasis für die Buchhaltung: Rechnungsdatum oder Leistungsmonat (die Betreiber-Zentrale zeigt beides)?
6. **Zahlungsabwicklung:** Zunächst nur Rechnung per Überweisung (keine Lastschrift) — steuerlich/organisatorisch ausreichend? Mahnwesen manuell.
7. **Betriebsausgaben:** Supabase (Pro-Plan), Hostinger, Domain — Umsatzsteuer bei Leistungen aus dem Ausland (Reverse-Charge)?

## Beigelegt

- [go-live-checkliste.md](go-live-checkliste.md), [risiken-und-luecken-verkauf.md](risiken-und-luecken-verkauf.md), [zahlenabgleich-demo.md](zahlenabgleich-demo.md).
