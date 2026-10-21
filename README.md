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

## Dokumentation

Alles Weitere steht in [`docs/`](docs/README.md):

| Du willst … | Lies … |
| --- | --- |
| verstehen, was Bellegio ist | [Überblick](docs/ueberblick.md) |
| die App bedienen (Laiensprache) | [Handbuch](docs/handbuch/README.md) — auch in der App unter Einstellungen → Hilfe |
| wissen, welche Funktion es wo gibt | [Funktionsübersicht](docs/funktionen.md) |
| Aufbau, Datenmodell, Rechenlogik verstehen | [Architektur](docs/architektur/architektur.md) |
| wissen, **warum** es so gebaut ist | [Entscheidungen](docs/entscheidungen/README.md) |
| Betrieb, Go-live, Risiken | [docs/betrieb](docs/betrieb/go-live-checkliste.md) |

### Dokumentation pflegen

- Neue Seite → Eintrag in `docs/funktionen.md` (der Test `tests/doku.test.ts` schlägt sonst fehl).
- Geänderte Bedienung → das passende Kapitel in `docs/handbuch/` anpassen (dieselben Dateien zeigt die App).
- Neue Grundsatzentscheidung → neue Datei in `docs/entscheidungen/` und im Index eintragen.
- Gesetzeswert geändert → Rechtsgrundlagen-Seite und das Runbook in `supabase/migrations/20260924110000_bundesland_regelwerk_historie.sql`.
