# 0001 — Next.js und Supabase statt eigenes Backend

**Frage:** Wie bauen wir eine Web-App für mehrere Träger, ohne einen eigenen Server samt Benutzerverwaltung zu betreiben?

**Entscheidung:** Next.js (App Router) für Oberfläche und Server-Logik, Supabase (Postgres, Auth, Zeilenschutz) als Datenbank und Anmeldung. Es gibt keinen separaten API-Server.

**Warum:** Ein kleines Team kann so Datenbank, Anmeldung und Oberfläche aus einem Repository pflegen. Supabase liefert Anmeldung, Passwort-Reset, Einladungen und Zeilenschutz fertig; Server-Komponenten und Server Actions ersetzen eine eigene Schnittstelle.

**Folgen:**
- Fehler aus Server Actions werden als Ergebnis zurückgegeben (`{ ok: false, error }`) statt geworfen, weil Next.js in Produktion die Texte geworfener Fehler ausblendet.
- Diese Next.js-Version weicht von älteren ab (`proxy.ts` statt `middleware.ts`); `AGENTS.md` verweist auf die mitgelieferte Doku in `node_modules/next/dist/docs/`.
- Datenbankänderungen liegen ausschließlich als Migrationen in `supabase/migrations/`.

**Fundstellen:** `app/`, `lib/supabase/`, `lib/actions/`, `proxy.ts`, `supabase/migrations/`.
