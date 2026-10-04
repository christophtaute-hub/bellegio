# Produktionsumgebung einrichten (Test und Produktion trennen)

Stand: 2026-10-04. Ziel: Echte Kundendaten liegen in einem eigenen Supabase-Projekt, getrennt von Demo, Testkonten und
Testdaten. Das heutige Projekt `bellegio` (`pvrbiamdcyxvnmzfstbk`) bleibt Test-/Demo-Umgebung.

## Warum

- Im Testprojekt liegen 14 Konten mit `@bellegio.test` (Passwort `test1234`), der öffentliche Demo-Zugang und Demo-Rechnungen.
- Das Free-Projekt pausiert nach ca. 7 Tagen Inaktivität und hat keine Backups. Für Kinderdaten (inkl. I-Status, Art. 9 DSGVO) ist beides nicht tragbar.

## Entscheidungen, die vorher nötig sind (Christoph)

1. **Pro-Plan** für die Organisation (Backups, kein Auto-Pausieren). Nur Christoph kann das buchen: Supabase → Organization → Billing.
   Zusätzliches Projekt kostet laufend Rechenleistung; die genaue Summe zeigt Supabase vor der Bestätigung an.
2. **Wo lebt die Demo künftig?** `bellegio.de` zeigt nach der Umstellung auf die Produktion. Der Demo-Zugang (`demo@bellegio.de`)
   existiert nur im Testprojekt. Optionen:
   - a) Demo bekommt eine eigene Adresse (z. B. `demo.bellegio.de`, zweite Web-App bei Hostinger auf das Testprojekt). Empfohlen.
   - b) Demo vorerst abschalten, bis der erste Kunde läuft.
3. **Absender-Mail** `support@bellegio.de` (Hostinger-Postfach) für Auth-Mails: SMTP-Zugangsdaten trägt Christoph selbst in Supabase ein.

## Schritte

### A. Projekt anlegen (Christoph oder ich nach seiner Bestätigung)

- Name `bellegio-prod`, Region **eu-central-1 (Frankfurt)**, starkes Datenbank-Passwort (Passwortmanager, nicht in den Chat).
- Ich lege es nur an, wenn Christoph den Pro-Plan gebucht und die Kosten bestätigt hat.

### B. Datenbank aufsetzen (ich)

- Alle 59 Dateien aus `supabase/migrations/` in Dateinamen-Reihenfolge einspielen (per `apply_migration`). Geprüft: keine festen UUIDs,
  die Daten-Migrationen (`betreiberdaten_wolfenbuettel`, `gruppen_voll_demokorrektur`) laufen auf leerer Datenbank ohne Wirkung bzw. setzen nur
  Impressums-Daten; Singleton-Zeilen (`listenpreise`, `betreiber_einstellungen`, `betreiber_oeffentlich`) legen die Migrationen selbst an.
- Danach `get_advisors` (Security): erwartet wird höchstens die Leaked-Password-Warnung bis Schritt C erledigt ist.
- Neue Typen müssen nicht erzeugt werden, das Schema ist identisch zu `types/database.types.ts`.

### C. Auth-Einstellungen in Supabase (Christoph, Dashboard → Authentication)

- **Sign-ups deaktivieren** (Providers → Email → „Allow new users to sign up“ aus). Die App hat keine Registrierung, Nutzer entstehen nur über Einladung. Bitte dasselbe auch im Testprojekt prüfen.
- **Leaked-Password-Protection** einschalten (Passwords).
- Mindestlänge Passwort mindestens 8, besser 10.
- **URL Configuration:** Site URL `https://bellegio.de`, Redirect URLs `https://bellegio.de/**`.
- **SMTP** (Emails → SMTP Settings): Host/Port/Benutzer/Passwort aus dem Hostinger-Postfach `support@bellegio.de`, Absendername „Bellegio“.
- **E-Mail-Vorlagen** (Invite user, Reset password, Change email) auf Deutsch; Formulierungen liegen aus der früheren Runde vor.
- **Zwei-Faktor** (TOTP) für den Betreiber später unter „Mein Profil“ einschalten.

### D. Erstbetreiber anlegen (ich, mit den Produktionsschlüsseln)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<Produktions-Service-Role-Key> \
APP_URL=https://bellegio.de \
npx tsx scripts/prod-erstbetreiber.ts
```

Der Service-Role-Key kommt aus Supabase → Project Settings → API des **Produktionsprojekts**. Er wird nur lokal im Terminal gesetzt, nie in eine Datei im
Repo geschrieben und nie im Chat gezeigt. Das Skript verweigert die Ausführung gegen das Testprojekt. Christoph öffnet danach den Einladungslink in der Mail
und setzt sein Passwort.

### E. Hostinger umstellen (Christoph)

hPanel → Websites → bellegio.de → **Umgebungsvariablen**: diese drei Werte auf das Produktionsprojekt ändern:

| Variable | Wert |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL des Produktionsprojekts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon-Key des Produktionsprojekts |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role-Key des Produktionsprojekts |

Danach unter **Einsätze** neu bereitstellen (die `NEXT_PUBLIC_*`-Werte werden beim Build eingebrannt, ein bloßer Neustart reicht nicht).
Wer zwischen Test und Produktion wechselt, tauscht genau diese drei Werte.

Die lokale `.env.local` bleibt auf dem Testprojekt, damit Entwicklung und Demo-Skripte nie Produktionsdaten berühren.

### F. Betreiberdaten pflegen (Christoph, in der App unter Abrechnung → Einstellungen)

- Firmenname/Anschrift, **Steuernummer oder USt-IdNr.** (steht im Testprojekt noch auf „folgt“, Pflichtangabe auf Rechnungen), IBAN/BIC, Zahlungsziel.
- Rechnungen erst nach Abstimmung mit dem Steuerberater versenden.

### G. Abschlusskontrolle (ich)

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/prod-pruefen.ts
```

Prüft: genau ein Betreiber, keine Test-/Demo-Konten, keine Demo-Rechnungen, Betreiber-/Impressumsdaten und Listenpreise vorhanden. Außerdem
Browser-Test: Login auf bellegio.de, Einladung eines Testnutzers mit echter Mail, Passwort-Reset, `/admin` nur für Christoph.

## Backups und Betrieb

- Pro-Plan: tägliche Backups; optional Point-in-Time-Recovery (kostenpflichtig) vor dem ersten zahlenden Kunden prüfen.
- Fehler: Tabelle `server_fehler_protokoll` (nur per SQL lesbar) liefert Gründe für „Unerwarteter Fehler“-Meldungen.
- Migrationen künftig immer zuerst im Testprojekt, dann in Produktion einspielen; nie Daten aus der Testwelt nach Produktion kopieren.

## Was bewusst nicht kopiert wird

Testträger, Testkitas, Demo-Daten, Test-/Demo-Konten, Demo-Rechnungen. Produktion startet leer und wird über die App
(Betreiber legt Kunde an, Träger-Admin legt Einrichtungen/Gruppen an, Import) befüllt.
