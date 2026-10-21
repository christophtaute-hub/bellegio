# 0002 — Zugriffsschutz in der Datenbank (RLS), nicht nur in der App

**Frage:** Wo wird entschieden, wer welche Daten sieht — in der Oberfläche oder in der Datenbank?

**Entscheidung:** In der Datenbank. Jede Tabelle hat Zeilenschutz (Row Level Security, RLS); die Regeln nutzen Hilfsfunktionen im Schema `app` (z. B. `app.current_user_zugriff`, `app.user_has_einrichtung_access`). Die Oberfläche blendet zusätzlich aus, was jemand nicht darf, verlässt sich aber nicht darauf.

**Warum:** Wer mit seinem Anmelde-Token die Datenbank direkt ansprechen würde, umgeht jede Prüfung in der Oberfläche. Kinderdaten, Gesundheitsangaben (I-Status) und Gehälter dürfen so nicht abfließen.

**Folgen:**
- Die Hilfsfunktionen liegen im nicht öffentlich erreichbaren Schema `app`. Funktionen in `public` mit `SECURITY DEFINER` sind per RPC aufrufbar und brauchen ein ausdrückliches `REVOKE EXECUTE`; nach jeder Migration wird der Security-Advisor geprüft.
- Ein `INSERT … RETURNING` auf `einrichtungen` scheitert unter RLS (die Zugriffsfunktion sieht die neue Zeile im selben Statement nicht): ID vorab erzeugen und ohne `RETURNING` einfügen (`legeEinrichtungAn`).
- Rechtetests laufen als SQL-Skripte mit Nutzer-Impersonation (`supabase/tests/`).

**Fundstellen:** `supabase/migrations/20260910130431_rls_helpers_and_policies.sql`, `supabase/tests/`, `lib/server/current-user-role.ts`.
