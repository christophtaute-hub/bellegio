# Bellegio — Risiken beim Verkauf und was noch fehlt

Stand: 07.10.2026 (zuletzt aktualisiert nach Milestone 33 und der Quellenprüfung). Ehrliche Einschätzung, nach Gewicht sortiert. „Risiko“ heißt: Kann einen Verkauf verhindern, Ärger oder Haftung auslösen. „Lücke“ heißt: Es fehlt etwas, das Kunden erwarten oder das den Betrieb absichert.

## A. Die größten Risiken

### 1. Rechenergebnisse, auf die sich Kunden verlassen (fachlich + Haftung)
- **Keine Fachperson hat die Gesetzeswerte geprüft.** Alle Formeln und Tabellen habe ich aus Gesetzestexten und amtlichen Veröffentlichungen abgeleitet und gegen unabhängige Nachrechnungen geprüft ([zahlenabgleich-demo.md](zahlenabgleich-demo.md)). Das beweist Konsistenz, nicht Richtigkeit gegenüber einer Förderstelle. **Neu seit 07.10.:** Die NRW-Personalstunden sind gegen die amtliche Anlage zu § 33 KiBiz geprüft (stimmen), die TVöD-SuE-Tabelle gegen die amtliche VKA-Tabelle (war um 20 % zu hoch und ist korrigiert). Der Basisfaktor in Bayern (unter 3 / ab 3 Jahren) wird aus dem Geburtsdatum nach Art. 21 Abs. 5 BayKiBiG abgeleitet.
- **Bayern:** Jahresbetrag und „Basiswert plus“ sind jetzt aus Art. 21/23 BayKiBiG belegt. **Nicht abgebildet:** Eigenanteil der Gemeinde (Art. 22), Sonderfälle nach § 24 AVBayKiBiG, die Teamkräftepauschale der Reform. Der Qualitätsbonus 2027–2029 ist mit vorläufigen Werten hinterlegt, der Basiswert 2027 ist noch nicht bekanntgegeben und bis dahin mit dem Wert von 2026 fortgeschrieben (das Controlling weist darauf hin).
- **NRW:** Kindpauschalen stammen aus einer kommunalen Beschlussvorlage, nicht aus KiBiz.web. Die Pauschale ist **nicht** das, was ein Träger bekommt (Land, Jugendamt, Träger und Eltern tragen sie gemeinsam). Einzelintegration, Mietzuschlag, §§ 34/35 fehlen. Die **KiBiz-Reform 2027/28** ist offen.
- **Baden-Württemberg:** Keine Landesformel für den Fördererlös, nur ein manueller Betrag. Die Ausnahmeregelung nach § 1a KiTaVO läuft bis 31.08.2027.
- **TVöD-Tabelle:** geprüft und korrigiert (siehe oben). Werte vor dem 01.05.2026 fehlen; kirchliche und private Träger zahlen oft anders (manuelles Gehalt ist möglich).
- **Das „Ergebnis“ ist Fördererlöse (plus Elternbeiträge laut eigener Preisliste, falls hinterlegt) minus Personalkosten.** Kommunale Anteile und Sachkosten fehlen. Ein negativer Wert sieht wie ein Defizit aus (Hinweis steht an der Zahl).
- **Folge:** Wer sich auf Zahlen verlässt und sich verrechnet, wird den Anbieter fragen. Nötig: klare Kennzeichnung als **Planungshilfe**, Haftungsbegrenzung in den AGB, Pilot mit echter Meldung, jährliche Pflege der Werte (Basiswert, Pauschalen, Tarif).

### 2. Datenschutz mit Kinder- und Gesundheitsdaten
- Kinderdaten, **I-Status** (Gesundheitsdaten, Art. 9 DSGVO), Namen und Geburtsdaten von Beschäftigten. Das ist die sensibelste Datenart überhaupt.
- AGB, AVV (Art. 28), TOM, Unterauftragnehmerliste und Löschkonzept existieren als **Entwürfe von mir, nicht anwaltlich geprüft**.
- Wahrscheinlich nötig, aber nicht vorhanden: **Datenschutz-Folgenabschätzung** und ein **Verarbeitungsverzeichnis** für Bellegio als Auftragsverarbeiter. Auftragsverarbeitungsverträge mit **Supabase** und **Hostinger** (bzw. deren Standard-AVV) müssen vorliegen und in die Unterauftragnehmerliste.
- Impressum: Steuernummer steht auf „folgt“. Der Betreiber ist uneinheitlich benannt („Christoph Taute Akademie“ im Impressum, früher „Löwenkickers GbR/Kita Piraten“). **Rechtsträger, Gewerbeanmeldung und Haftung klären.**

### 3. Betrieb: eine Umgebung für alles
- Test, Demo und die Seite `bellegio.de` hängen am **selben kostenlosen Supabase-Projekt**: keine Backups, Pausierung nach Inaktivität möglich, 14 Testkonten mit dem Passwort `test1234`, ein öffentlicher Demo-Login.
- **Das Demo-Passwort stand im Repository** (`scripts/landing-screenshots.ts`, Git-Verlauf). Das Skript nutzt es nicht mehr, im Verlauf bleibt es lesbar. Empfehlung: Passwort neu vergeben (`scripts/demo-einrichten.ts --neues-passwort`) und prüfen, ob das Repository privat ist.
- Registrierung in Supabase vermutlich noch an (Schalter ausschalten, siehe [produktion-einrichten.md](produktion-einrichten.md)); Leaked-Password-Schutz aus; keine Pflicht-2FA für Träger-Admins.
- Kein **Monitoring/Uptime**, keine Fehlerauswertung außer der Tabelle `server_fehler_protokoll`, kein getesteter Wiederherstellungsweg.
- Ein einzelner Hostinger-Node-Dienst, Build nur mit `--webpack` (bekannte Eigenheit des Hosters).
- **Plan steht:** erst Pro-Plan und getrennte Produktion, bevor echte Daten eingegeben werden. Das ist die wichtigste Bedingung für den ersten Kunden.

### 4. Noch kein echter Nutzer
- Alles wurde mit erfundenen Demo-Daten gebaut und geprüft. Es gibt **keine Pilot-Kita**, keinen Abgleich mit einer echten Personalbelegungsliste oder Meldung, kein Feedback aus dem Alltag.
- Folge: unbekannte Randfälle (Altersmischung, Wechsel der Gruppe mitten im Jahr, abweichende Excel-Formate beim Import).

### 5. Markt und Erwartung
- **Konkurrenz/Alternativen:** Kita-Verwaltungssoftware (z. B. KigaRoo, Kita-Planer, Elternportale) deckt Verträge, Eltern, Beiträge ab. Bellegio ist **Controlling und Personalplanung**. Ohne Schnittstelle bedeutet das doppelte Datenpflege (Excel-Import vorhanden, **keine API**).
- Nur **drei Bundesländer**. Andere Länder (Niedersachsen, Hessen, …) rechnen anders.
- **Meldewesen:** Es gibt Excel/PDF-Exporte und die Prüfungsmappe, aber **keinen Export in die Formate der Landesportale** (Formate nie recherchiert). Wer „Meldung direkt aus dem Tool“ erwartet, wird enttäuscht.
- **Preis:** 15 € je Einrichtung plus 1,20/0,80/0,60 € je Kind und Monat ist niedrig. Bei 60 Kindern ca. 60 € im Monat. Support, Pflege der Gesetzeswerte und Hosting müssen sich damit tragen. Mindestlaufzeit, Kündigung, Testphase sind nicht festgelegt.

## B. Weitere Risiken (mittel)

- **Abrechnung/Steuer:** Rechnungen als PDF mit Nummernkreis und Sperre nach Freigabe vorhanden. **Nicht abgestimmt** mit dem Steuerberater (§ 14 UStG, Kleinunternehmerfrage). **E-Rechnung** (ZUGFeRD/XRechnung) ist im B2B Pflicht auf dem Weg und fehlt. Keine Zahlungsabwicklung (SEPA).
- **Performance:** Dashboard und Controlling rechnen den Forecast beim Aufruf (ca. 4–9 Sekunden pro Einrichtung auf dem Entwicklungsrechner). Die Träger-Übersicht berechnet mehrere Kacheln. Mit 20+ Einrichtungen und vielen Nutzern **ungetestet**.
- **Wartbarkeit:** Ein Entwickler (Bus-Faktor 1), ein junges Framework (Next 16 mit Änderungen gegenüber dem Üblichen). Tests: 351 automatische Tests und sieben SQL-Prüfungen (Rechte, Löschung, Basisfaktor), aber **keine End-to-End-Tests**, keine Lasttests.
- **Barrierefreiheit** nicht geprüft; öffentliche und kirchliche Träger fragen oft danach. Mobile Nutzung nur grob geprüft.
- **Datenqualität:** Der Import prüft Pflichtfelder, aber echte Kunden-Excel sehen anders aus. Fehler im Import sind Support-Aufwand.
- **Aktualität der Gesetze:** Jedes Jahr ändern sich Basiswert, Pauschalen, Tarif; Reformen in BY (2027) und NRW (2027/28) stehen an. Das ist laufende Arbeit und eine Zusage an Kunden.

## C. Was noch fehlt (nach Priorität)

**Vor dem ersten echten Kunden (Pflicht)**
1. Pro-Plan und **getrennte Produktion**; Demo auf eigene Adresse; Testkonten und Demo-Passwort aus der Produktion fernhalten.
2. **Anwalt:** AGB, AVV, Datenschutzerklärung, Haftungsbegrenzung, Planungshilfe-Hinweis; prüfen, ob DSFA nötig ist.
3. **Steuerberater:** Rechnung, Umsatzsteuer, Steuernummer; Rechtsträger klären.
4. **Pilot-Kita** mit echten Daten **nach** Schritt 1: Zahlen gegen deren echte Meldung/Excel abgleichen.
5. Auth-Härtung: Registrierung aus, Leaked-Password-Schutz, SMTP mit eigenem Absender und deutschen Vorlagen, Passwort-Länge, 2FA für Träger-Admins.
6. Monitoring (Fehler, Uptime), Backup-Wiederherstellung einmal testen, Support-Postfach und Prozess.

**Kurz danach**
7. Förderformeln mit einer Fachperson durchgehen (Bayern Art. 22, Reform 2027; NRW Reform, Trägeranteil; BW).
8. Preise, Mindestlaufzeit, Kündigungsfrist, Testphase festlegen und in die AGB.
9. Onboarding-Material (kurze Anleitung, Excel-Vorlagen je Bundesland, Videotour).
10. Performance-Test mit 20+ Einrichtungen; ggf. Forecast zwischenspeichern.

**Später (Wachstum)**
11. Kommunaler Anteil und Sachkosten, damit das Ergebnis vollständig ist (Elternbeiträge sind als Preisliste möglich).
12. Export in die Formate der **Landesportale**, Schnittstellen/Import aus gängigen Verwaltungsprogrammen.
13. Weitere Bundesländer; Träger-Cockpit; Springer-/Ausfallplanung; E-Rechnung; SEPA; Barrierefreiheit; End-to-End-Tests.

## D. Meine Einschätzung in einem Satz

Technisch und fachlich ist das Produkt **demo- und pilotfähig**. **Verkaufsfähig** wird es erst mit getrennter Produktion, geprüften Rechtstexten und einer echten Pilot-Kita, die die Zahlen bestätigt. Das größte Risiko ist nicht der Code, sondern, dass sich ein Kunde auf eine Förderzahl verlässt, die nach einer Gesetzesänderung nicht mehr stimmt.
