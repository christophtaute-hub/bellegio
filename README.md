# Bellegio

Kita-Controlling für Bayern, Baden-Württemberg und Nordrhein-Westfalen: Belegung, Personalschlüssel (je Bundesland im eigenen Rechenmodell), Forecast, Meldewesen-Auswertungen und eine Betreiber-Zentrale für Rechnungen.

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · Tailwind · Vitest.
Hinweis für Entwicklung: Diese Next.js-Version weicht von älteren ab (z.B. `retry` statt `reset` in `error.tsx`, `proxy.ts` statt `middleware.ts`). Vor Änderungen die Doku unter `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`).

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Supabase-Werte eintragen
npm run dev
```

Prüfungen vor jedem Push (laufen auch in der CI):

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

## Umgebungsvariablen

| Variable | Wo | Zweck |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Server + Browser | Supabase-Projekt-URL (auch in der CSP erlaubt) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server + Browser | öffentlicher Schlüssel, Zugriff nur über RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | nur Server | Nutzer anlegen/einladen und Skripte. Nie im Client-Bundle, nie in öffentliche Logs |

## Datenbank

Alle Änderungen liegen als Migrationen in `supabase/migrations/` (Reihenfolge = Dateiname). Hilfsfunktionen für Rechte liegen im nicht öffentlich exponierten Schema `app`. Nach jeder Migration den Security-Advisor prüfen; neue `SECURITY DEFINER`-Funktionen in `public` sind per RPC aufrufbar und brauchen ein explizites `REVOKE EXECUTE`.

Tests für die reine Rechenlogik: `npm test` (Ordner `tests/`). Sie decken die drei Personalmodelle, die Kategorisierung, den Personal-Ausblick, die Belegungs-Vorschau und die Passwortregeln ab. Neue Rechenregeln bekommen zuerst einen handgerechneten Testfall.

## Neuen Kunden aufsetzen

Ohne Skript oder SQL:

1. Als Betreiber unter `/admin/kunden/neu` Träger, erste Einrichtung (Bundesland ist danach fix) und die Träger-Administration anlegen — per Einladungs-Mail oder mit Start-Passwort.
2. Die Träger-Administration legt weitere Einrichtungen (`/einrichtung-auswahl/neu`, Einstellungen) und Gruppen (`/gruppen/neu`) selbst an und lädt Kolleginnen und Kollegen unter Einstellungen → Nutzer & Rechte ein.
3. Kinder und Personal kommen einzeln oder per Excel/CSV-Import (`/kinder/import`, `/team/import`) hinein. Der Import prüft zuerst und schreibt erst nach Bestätigung; Regeln stehen in `lib/import/`.

Server Actions geben erwartbare Fehler als Ergebnisobjekt (`{ ok: false, error }`) zurück statt sie zu werfen — in Produktion blendet Next.js Fehlertexte geworfener Fehler aus.

## Sitzplätze, Notizen-Verlauf, Preis-Staffel

- **Gruppen-Sitzplätze**: Die Gruppen-Seite (`app/(app)/gruppen/[gruppeId]/page.tsx`, `lib/gruppen/sitzplaetze.ts`) zeigt 1..Sollplätze statt des früheren freien `kinder.platznummer`-Feldes — belegt in Alters-Reihenfolge, freie Plätze bleiben leer. `platznummer` bleibt als Spalte für Altdaten erhalten, wird aber nicht mehr befüllt/angezeigt. Ein Nachrücker mit gesetztem `kinder.ersetzt_kind_id` erscheint auf dem Platz des referenzierten aktiven Kindes; ohne Verknüpfung bleibt der Platz „offen" (rein optional, kein Zwang). Suche/Sortierung (Name, Buchungszeit, Eintritt, Austritt, Status) blendet dabei die freien Plätze aus — die Standardansicht ohne Suchbegriff/Sortierung zeigt weiterhin das vollständige Sitzplatzbild.
- **Notizen-Verlauf**: `kind_notizen_verlauf` (append-only, gleiches RLS-Muster wie `kind_buchungszeit_historie`) hat das einzelne, überschreibbare `kinder.notizen`-Feld abgelöst — jede Notiz bleibt als eigener, datierter Eintrag erhalten (`components/kinder/notizen-verlauf.tsx`, `fuegeNotizHinzu` in `lib/actions/kinder.ts`). Die Spalte `kinder.notizen` bleibt für Altdaten in der DB, wird aber nirgends mehr beschrieben.
- **Krippe-Übergang-Hinweis**: `krippenUebergangWarnung` (`lib/kita-datum.ts`) markiert Kinder in einer Gruppe mit `gruppenart='krippe'`, die bereits 3 sind oder es in den nächsten 3 Monaten werden — bundeslandunabhängig, rein informativ (Verlängerung bis Kitajahresende oder neuer Kindergarten-Vertrag), sichtbar auf der Gruppen- und der Kind-Seite.
- **Kostenstelle/Cluster**: `einrichtungen.kostenstelle`/`.cluster` (freier Text) sind bei Anlegen und Bearbeiten einer Einrichtung pflegbar — reine Datenhaltung für spätere Controlling-Auswertungen, aktuell noch ohne Filterung/Gruppierung.
- **Preis-Staffel (Variante B)**: `listenpreise`/`trager_abrechnung` haben `preis_pro_kind` durch drei feste Stufen ersetzt (1.–30./31.–60./ab 61. Kind, Grenzen fest in `lib/preise.ts`, nur die drei Preise sind pflegbar) — gilt je Einrichtung, nicht gebündelt über mehrere Einrichtungen eines Trägers. `verteileAufStaffel`/`berechneMonatspreis` sind die gemeinsame Rechenbasis für Landingpage-Rechner und echten Rechnungsvorschlag (`berechneRechnungsvorschlag` in `lib/admin/abrechnung.ts`, erzeugt bis zu drei „Nutzung je Kind"-Positionen je Einrichtung statt einer).

Insert mit `.select()` auf `einrichtungen` scheitert unter RLS (die Zugriffsfunktion sieht die neue Zeile im selben Statement nicht): ID vorab erzeugen und ohne `RETURNING` einfügen, siehe `legeEinrichtungAn`.

## Dashboard-Hinweise

Läuft für ein Teammitglied aktuell eine Ausfallzeit vom Typ Krankheit, Schwangerschaft oder Mutterschutz, zeigt das Dashboard einen Hinweis dazu (`components/dashboard/personal-hinweise.tsx`, Regeln in `lib/team/langzeithinweise.ts`). Sonderurlaub und Sonstiges erscheinen dort bewusst nicht.

## Buchungszeit-Historie

Ändert ein Kind seine Buchungszeit, schreibt `updateKind`/`createKind` (`lib/actions/kinder.ts`) zusätzlich eine Zeile in `kind_buchungszeit_historie` (ein Datum je Zeile, kein „gültig bis“ — „welches Band galt an Tag X“ ist immer die Zeile mit dem größten `gueltig_ab <= X`). `kinder.buchungszeit_band_id` bleibt der bequeme aktuelle Wert für Formulare/Listen/Import, ist aber nicht mehr die Quelle für Stichtag-Auswertungen: Dashboard, Forecast/Controlling, Personal-Ausblick und der Szenario-Rechner-Startwert lesen über die RPC `kinder_presence_at_date` (löst das Band pro Kind zum jeweiligen Stichtag auf), die Kalenderjahr-Kategorisierung löst pro Kind/Monat unabhängig davon auf (`lib/controlling/jahreskategorisierung.ts`). Ehrliche Grenze: Stichtage vor dem Anlegen der Historie zeigen die zum Anlegezeitpunkt aktuelle Buchungszeit, echte Vergangenheit lässt sich nicht rekonstruieren. Keine `update`/`delete`-Policy über die App (Audit-Charakter wie das Änderungsprotokoll); eine Korrektur macht die Träger-Administration nötigenfalls per SQL. Test: `tests/buchungszeit-historie.test.ts`, `tests/zeitkategorie-uebersicht.test.ts`.

## Nutzerverwaltung

Träger-Administratoren legen Nutzer direkt in den Einrichtungs-Einstellungen an (`/einstellungen`): Rolle, Rechte je Bereich/Einrichtung, Zugang per Passwort oder Einladung. Sie können dort auch das Passwort eines Nutzers neu setzen, die Rolle ändern und den Nutzer löschen (`lib/actions/berechtigungen.ts`, geprüft in `lib/nutzer/verwaltung.ts`). Ein Träger-Admin kann nicht über diese Oberfläche geändert/gelöscht werden — dafür siehe unten „Mein Profil“.

Alle Nutzer-Aktionen laufen über `mitZeitlimit()` (`lib/supabase/mit-zeitlimit.ts`, Default 20s) und geben bei jedem Fehler `{ok:false, error}` zurück statt zu werfen — ohne das bliebe ein Button bei einer hängenden Verbindung zu Supabases Admin-API dauerhaft im Ladezustand hängen (kein eigenes Zeitlimit in supabase-js). Jeder Aufrufer im Client hat zusätzlich ein try/catch/finally als zweite Absicherung.

## Demo-Zugang

`scripts/demo-einrichten.ts` kopiert die drei Testkitas in einen eigenen Träger „Bellegio Demo“ und legt `demo@bellegio.de` als dessen Träger-Administration an (`user_profiles.ist_demo = true`). Ein Demo-Konto darf alles ausprobieren (auch Löschen, Import, Nutzer anlegen), sieht aber keine Abrechnung, kann sein Passwort und Zwei-Faktor nicht selbst ändern und muss AGB/AVV nicht bestätigen. Erneutes Ausführen setzt die Demo-Daten zurück (Kopie neu aus der Quelle, inklusive `kind_buchungszeit_historie`); `--neues-passwort` vergibt ein neues Passwort für den bestehenden Demo-Nutzer.

`scripts/seed-milestone25-datenqualitaet.ts` befüllt auf den drei Testkitas unter „Villa Kunterbunt“ Notizen/Wohnort/Vertragsende/Einschulungsstatus auf ca. 85 % (nur leere Felder, idempotent), legt je Kita eine Ausfallzeit an und schreibt je Kita einen echten Buchungszeit-Wechsel in die Historie — wirkt über `demo-einrichten.ts` beim nächsten Zurücksetzen automatisch auch im Demo-Zugang.

`scripts/seed-milestone26-kapazitaet.ts` füllt die großen, bisher nur zu 10–25 % belegten Gruppen auf realistische ~85–90 % (Zielgruppe: eine Kita vorführen können, ohne dass Räume leer wirken) und ergänzt in Bayern zwei neue Personen — eine davon bewusst als Vertretung für Sarah Langs Schwangerschaft/Beschäftigungsverbot, deren dauerhaft unbekanntes Ende sonst den Anstellungsschlüssel schon ab September 2026 statt erst ab April 2027 (Julia Vogts Austritt) ins Rot gekippt hätte. Ebenfalls idempotent.

## Landingpage-Screenshots

Die Mockup-Komponenten unter `components/landing/mockups/` zeigen keine nachgebauten Bildschirme mehr, sondern echte PNG-Screenshots aus `public/images/landing/`. `scripts/landing-screenshots.ts` nimmt sie über das lokal installierte Chrome (per `puppeteer-core`, kein Chromium-Download) mit dem Demo-Zugang neu auf und überschreibt die Dateien. Nach größeren UI-Änderungen an Dashboard/Team/Gruppen-Vorschau/Controlling/Kind-Profil erneut ausführen:

```bash
npx tsx scripts/landing-screenshots.ts
```

Voraussetzung: `next dev` läuft bereits auf Port 3000.

## Datenschutz und Rechtstexte

- Löschen/Anonymisieren für ausgetretene Kinder und ausgeschiedenes Personal laufen über die Datenbankfunktionen `kind_datenschutz` und `team_datenschutz` (Definer-Funktion im Schema `app`, Wrapper in `public`; nur Träger-Administration, protokolliert in `loeschprotokoll`). Das Änderungsprotokoll enthält komplette Datensätze und wird dabei mit bereinigt. Tests: `supabase/tests/datenschutz_loeschen.sql`, `supabase/tests/rechtstexte_zugriff.sql`.
- Auskunft nach Art. 15 DSGVO: `/kinder/[id]/auskunft`, `/team/[id]/auskunft` (Druck und Excel).
- Impressum, Datenschutz, AGB, AVV, TOM und Unterauftragnehmer sind Entwürfe. Die Angaben des Betreibers pflegt `/admin/einstellungen`; fehlende Pflichtangaben erscheinen auf den Seiten als sichtbare Lücke. Erst wenn dort „Rechtstexte geprüft und freigegeben“ gesetzt ist, verschwindet der Entwurfshinweis und Träger-Administratoren müssen AGB und AVV bestätigen (Versionen in `lib/rechtstexte/version.ts` — bei inhaltlicher Änderung erhöhen).
- Die Texte sind Entwürfe und ersetzen keine Rechtsberatung. Vor dem Livegang von einer Fachperson prüfen lassen.

## Produktivbetrieb (Checkliste)

- Eigenes Supabase-Projekt für Produktion (Frankfurt, Pro-Plan für Backups/PITR); das bisherige Projekt bleibt Test/Demo. Alle Migrationen einspielen. **Keine Testkonten in Produktion.**
- Supabase Auth → URL-Konfiguration: Site URL auf die Produktiv-Domain setzen und `https://<domain>/passwort-setzen` als Redirect-URL erlauben (sonst funktionieren „Passwort vergessen“ und Einladungen nicht).
- Supabase Auth → SMTP: eigenen Mailanbieter eintragen und die deutschen Vorlagen (Einladung, Passwort zurücksetzen) hinterlegen. Der Standardversand ist stark begrenzt.
- Supabase Auth → Passwörter: „Leaked password protection“ einschalten (Pro-Plan). Die Mindestlänge (10 Zeichen) erzwingt die App in `lib/passwort.ts`.
- Betreiber eintragen: `insert into platform_operators (user_id) values ('<auth-user-id>')`. Es darf genau einen Eintrag geben (Christoph) — kein Testkonto. `supabase/tests/betreiber_zugriff.sql` prüft, dass sonst niemand Umsatz, Rechnungen oder Betreiberdaten sieht (Erwartung am Ende: `operatoren=1`).
- Für den Betreiber Zwei-Faktor (Authenticator-App) unter „Mein Profil“ einschalten; danach sperrt `/admin` ohne bestätigten Code.
- Betreiberdaten unter `/admin/einstellungen` und Preise unter `/admin/kunden` pflegen; Demo-Rechnungen entfernen (SQL im Kopf von `scripts/seed-milestone18-betreiber.ts`).
- Hosting mit HTTPS und den drei Umgebungsvariablen oben. Die Security-Header (CSP, HSTS, X-Frame-Options …) setzt `next.config.ts`; bei neuen externen Diensten die CSP dort erweitern.
- Impressum und Datenschutz (`app/impressum`, `app/datenschutz`) enthalten noch Platzhalter und müssen vor dem Livegang mit den echten Angaben ersetzt werden.
