# Go-live-Checkliste: erster echter Kunde

Stand: 07.10.2026. **Wer:** C = Christoph (Konten, Zahlungen, Entscheidungen), K = Claude (Code, Datenbank, Skripte), E = extern (Anwalt, Steuerberater, Pilot-Kita).
Reihenfolge ist wichtig: Erst Abschnitt 1–3, dann echte Daten. Bis dahin gilt: **keine echten Namen von Kindern oder Mitarbeitenden in der Testumgebung.**

## 1. Betrieb trennen (vor dem ersten echten Datensatz)

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 1.1 | Supabase **Pro-Plan** für die Organisation buchen (Backups, kein Auto-Pausieren, Leaked-Password-Schutz). Kosten zeigt Supabase vor der Bestätigung. | C | offen |
| 1.2 | Produktionsprojekt `bellegio-prod` (Frankfurt, eu-central-1) anlegen — oder „Rollen tauschen“ (siehe [produktion-einrichten.md](produktion-einrichten.md)). | C bestätigt, K richtet ein | offen |
| 1.3 | Alle Migrationen aus `supabase/migrations/` einspielen (68 Dateien, Dateinamen-Reihenfolge); Bündel für den SQL-Editor: `cat supabase/migrations/*.sql > /tmp/bellegio-alle-migrationen.sql`. Danach `get_advisors` (Security). **Erster Wiederholungslauf auf einer leeren Datenbank — bisher nicht getestet.** | K | offen |
| 1.4 | Erstbetreiber anlegen: `scripts/prod-erstbetreiber.ts` (Service-Key nur im Terminal, nie im Chat). | K + C | offen |
| 1.5 | Hostinger: die drei Umgebungsvariablen auf Produktion umstellen (URL, anon-Key, Service-Role-Key) und unter „Einsätze“ neu bereitstellen. | C | offen |
| 1.6 | Demo auf eigene Adresse (`demo.bellegio.de`, zweite Web-App auf dem Testprojekt); Demo-Daten und Testkonten bleiben im Testprojekt. | C + K | offen |
| 1.7 | **Demo-Passwort neu vergeben** (steht im Git-Verlauf): `npx tsx --env-file=.env.local scripts/demo-einrichten.ts --neues-passwort` — das neue Passwort erscheint nur im Terminal. Prüfen, ob das Repository **privat** ist. | C | offen |
| 1.8 | Abschlusskontrolle: `NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/prod-pruefen.ts` (prüft jetzt auch die Referenzdaten und dass keine Demo-Träger existieren). | K | bereit |

## 2. Anmeldung und Mail (Supabase → Authentication, im Produktionsprojekt)

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 2.1 | **Sign-ups deaktivieren** (Providers → Email → „Allow new users to sign up“ aus). Nutzer entstehen nur über Einladung. | C | offen |
| 2.2 | Site URL `https://bellegio.de`, Redirect URLs `https://bellegio.de/**`. | C | offen |
| 2.3 | Passwort-Mindestlänge 10, **Leaked-Password-Protection** an (Pro-Plan). | C | offen |
| 2.4 | **SMTP**: Postfach `support@bellegio.de` (Hostinger), Absendername „Bellegio“; deutsche Vorlagen für Einladung, Passwort-Reset, E-Mail-Änderung. Zugangsdaten trägt Christoph selbst ein. | C (Texte: K) | offen |
| 2.5 | Zwei-Faktor (TOTP) für den Betreiber unter „Mein Profil“ einschalten. | C | offen |
| 2.6 | Test: Einladung an eine echte Adresse, Passwort-Reset, `/admin` nur für Christoph. | C + K | offen |

## 3. Geschäftsdaten (Betreiber-Zentrale → Einstellungen)

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 3.1 | Impressum-/Betreiberdaten final, **Steuernummer** (steht auf „folgt“), IBAN/BIC, Zahlungsziel. | C | offen |
| 3.2 | **Preise festlegen** (Grundgebühr, Staffel je Kind), Mindestlaufzeit, Kündigungsfrist, Testphase — danach unter Listenpreise eintragen; die Landingpage zeigt sonst „Preise folgen“. | C | offen |
| 3.3 | Demo-Rechnungen löschen (SQL im Kopf von `scripts/seed-milestone18-betreiber.ts`) — nur falls sie ins Produktionsprojekt gelangt wären; dort startet alles leer. | K | bei Bedarf |

## 4. Recht und Steuern (extern, am längsten Vorlauf — früh beauftragen)

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 4.1 | **Anwalt/Datenschutz:** Texte prüfen lassen — Briefing in [anwalt-und-steuerberater.md](anwalt-und-steuerberater.md). Danach im Admin „Rechtstexte geprüft“ setzen (blendet den Entwurfshinweis aus, Träger bestätigen AGB/AVV beim Login). | E | offen |
| 4.2 | **Steuerberater:** Rechnungsvorlage, Umsatzsteuer, Rechtsträger, E-Rechnung — Fragen im selben Dokument. | E | offen |
| 4.3 | Verzeichnis von Verarbeitungstätigkeiten und Datenschutz-Folgenabschätzung (Kinderdaten, I-Status = Gesundheitsdaten) — Anwalt/Datenschutzbeauftragte klären, ob nötig. | E | offen |
| 4.4 | Auftragsverarbeitungsverträge mit Supabase und Hostinger (deren Standard-AVV) abschließen und in der Unterauftragnehmer-Liste führen. | C | offen |

## 5. Pilot-Kita

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 5.1 | Pilot-Kita und Bundesland festlegen; schriftliche Vereinbarung (Testphase, Datenschutz). | C + E | offen |
| 5.2 | Kunden in der Betreiber-Zentrale anlegen (Träger → Einrichtung → Träger-Administration), Gruppen anlegen, Daten per Excel-Import (Vorlage je Bundesland). Anlegen und alle Seiten einer leeren Einrichtung am 07.10.2026 im Testprojekt durchgespielt (ohne Fehler). | C | bereit |
| 5.3 | **Zahlenabgleich** mit der echten Meldung/Personalliste der Pilot-Kita (Vorgehen wie [zahlenabgleich-demo.md](zahlenabgleich-demo.md)): Anstellungsschlüssel, Kategorisierung, Förderbetrag. Abweichungen in Rechenlogik oder Doku beheben. | K + C | offen |
| 5.4 | Rückmeldungen der Leitung einsammeln (eine Woche Alltag), dann entscheiden: Kunde Nr. 2. | C | offen |

## 6. Betrieb im Alltag

| # | Aufgabe | Wer | Status |
| --- | --- | --- | --- |
| 6.1 | **Uptime-Check** auf `https://bellegio.de/login` (z. B. kostenloser Dienst, Benachrichtigung per Mail). | C | offen |
| 6.2 | **Fehlerprotokoll** wöchentlich ansehen: `select * from server_fehler_protokoll order by erstellt_am desc limit 20;` (Supabase SQL-Editor). | C / K | offen |
| 6.3 | **Backup-Wiederherstellung** einmal testen (Pro-Plan: Wiederherstellung in ein neues Projekt). | C + K | offen |
| 6.4 | **Gesetzeswerte pflegen:** jährlich Basiswert/Qualitätsbonus Bayern, KiBiz-Fortschreibungsrate, TVöD-Tabelle; Reformen NRW (ab 08/2027) und Bayern (01/2027) nachziehen. Vorgehen: Runbook in `supabase/migrations/20260924110000_bundesland_regelwerk_historie.sql`. | K | laufend |
| 6.5 | Support-Postfach und Antwortzeit festlegen (Mail an `support@bellegio.de`). | C | offen |

## Was technisch schon erledigt ist

- Zeilenschutz (RLS) auf **allen** Tabellen aktiv und mit Regeln versehen (geprüft 07.10.2026); Sicherheits-Hinweise der Datenbank: nur der bekannte Leaked-Password-Hinweis (wird mit dem Pro-Plan aktiv).
- Getrennte Rechte je Bereich, Einzelgehälter als eigenes Recht, Rechnungen nur für den Betreiber.
- Löschen/Anonymisieren und Auskunft (Art. 15 DSGVO), Änderungsprotokolle, Löschfristen.
- Security-Header, Fehlerseiten, Fehlerprotokoll in der Datenbank.
- Gesetzeswerte: NRW-Personalstunden gegen die amtliche Anlage geprüft, TVöD-SuE gegen die VKA-Tabelle (korrigiert), Bayern-Reform 2027 vorläufig hinterlegt und im Controlling gekennzeichnet.
- 351 automatische Tests, sieben SQL-Prüfungen.
