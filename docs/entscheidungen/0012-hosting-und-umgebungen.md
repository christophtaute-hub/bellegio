# 0012 — Hosting, Umgebungen und Build

**Frage:** Wo läuft die App, und wie ist sie von Test und Demo getrennt?

**Entscheidung:** Die App läuft als Node-Anwendung bei Hostinger (automatischer Build bei jedem Push auf `main`), die Datenbank bei Supabase (Region Frankfurt). Der Produktions-Build läuft mit `next build --webpack`. Die öffentliche Demo ist ein eigener Träger („Bellegio Demo“), der per Skript aus der Arbeitskopie befüllt wird. Die Trennung von Test und Produktion (zweites Supabase-Projekt, Pro-Plan) ist geplant und steht vor dem ersten echten Kunden.

**Warum:** Die Begründung für Hostinger als Anbieter ist nicht dokumentiert. `--webpack`, weil der Standard-Build (Turbopack) im Hostinger-Container beim CSS-Verarbeiten abstürzte (Worker-Prozess startet dort nicht); lokal baut beides.

**Folgen:**
- Bis zur Trennung teilen sich Test, Demo und `bellegio.de` dasselbe Supabase-Projekt. Echte Daten gehören dort nicht hinein.
- Umgebungsvariablen (Supabase-URL, Anon-Key, Service-Key) stehen im Hostinger-Dashboard.

**Fundstellen:** `package.json` (Skript `build`), `docs/betrieb/produktion-einrichten.md`, `docs/betrieb/go-live-checkliste.md`, `scripts/demo-einrichten.ts`.
