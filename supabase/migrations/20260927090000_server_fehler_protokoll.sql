-- Milestone 30, Phase A: Fehlerprotokoll für Server Actions.
--
-- Hintergrund: `lib/actions/berechtigungen.ts::alsErgebnis()` protokolliert geworfene Ausnahmen bisher
-- nur per `console.error` — das landet in den Server-Logs der jeweiligen Hosting-Umgebung. Für die
-- lokale Entwicklung ist das ausreichend, aber für ein Produktiv-Deployment (z.B. bellegio.de) hat
-- Claude Code keinen Zugriff auf das Hosting-Dashboard und kann den echten Fehler nicht sehen.
--
-- Bewusst über den normalen (cookie-/anon-key-basierten) Client beschreibbar, NICHT über den
-- Service-Role-Client: genau eine fehlende SUPABASE_SERVICE_ROLE_KEY-Umgebungsvariable ist der
-- naheliegendste Verdacht für den bisher unklärbaren bellegio.de-Bug — würde das Protokollieren
-- selbst den Service-Role-Client benutzen, bliebe im genau relevanten Fall stumm. Lesbar ist die
-- Tabelle dagegen nur über die Supabase-Admin-API/MCP (keine select-Policy) — kein App-Nutzer kann
-- die Einträge je einsehen, sie dienen ausschließlich der Diagnose durch das Projektteam.

create table public.server_fehler_protokoll (
  id uuid primary key default gen_random_uuid(),
  kontext text not null,
  fehler text not null,
  erstellt_am timestamptz not null default now()
);

alter table public.server_fehler_protokoll enable row level security;

create policy server_fehler_protokoll_insert on public.server_fehler_protokoll
  for insert to authenticated
  with check (true);

-- Bewusst keine select/update/delete-Policy für anon/authenticated — nur über die
-- Supabase-Admin-API (Service-Role/MCP) erreichbar.
