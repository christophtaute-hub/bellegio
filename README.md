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

Insert mit `.select()` auf `einrichtungen` scheitert unter RLS (die Zugriffsfunktion sieht die neue Zeile im selben Statement nicht): ID vorab erzeugen und ohne `RETURNING` einfügen, siehe `legeEinrichtungAn`.

## Dashboard-Hinweise

Läuft für ein Teammitglied aktuell eine Ausfallzeit vom Typ Krankheit, Schwangerschaft oder Mutterschutz, zeigt das Dashboard einen Hinweis dazu (`components/dashboard/personal-hinweise.tsx`, Regeln in `lib/team/langzeithinweise.ts`). Sonderurlaub und Sonstiges erscheinen dort bewusst nicht.

## Nutzerverwaltung

Träger-Administratoren legen Nutzer direkt in den Einrichtungs-Einstellungen an (`/einstellungen`): Rolle, Rechte je Bereich/Einrichtung, Zugang per Passwort oder Einladung. Sie können dort auch das Passwort eines Nutzers neu setzen, die Rolle ändern und den Nutzer löschen (`lib/actions/berechtigungen.ts`, geprüft in `lib/nutzer/verwaltung.ts`). Ein Träger-Admin kann nicht über diese Oberfläche geändert/gelöscht werden — dafür siehe unten „Mein Profil“.

## Demo-Zugang

`scripts/demo-einrichten.ts` kopiert die drei Testkitas in einen eigenen Träger „Bellegio Demo“ und legt `demo@bellegio.de` als dessen Träger-Administration an (`user_profiles.ist_demo = true`). Ein Demo-Konto darf alles ausprobieren (auch Löschen, Import, Nutzer anlegen), sieht aber keine Abrechnung, kann sein Passwort und Zwei-Faktor nicht selbst ändern und muss AGB/AVV nicht bestätigen. Erneutes Ausführen setzt die Demo-Daten zurück (Kopie neu aus der Quelle); `--neues-passwort` vergibt ein neues Passwort für den bestehenden Demo-Nutzer.

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
