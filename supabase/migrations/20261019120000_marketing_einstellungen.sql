-- Milestone 35, M5: zentral konfigurierbare Kriterien, Grenzwerte und Fristen der Marketing-Ampel (eine Zeile je Träger).
-- Fehlt die Zeile, gelten die Standardwerte der App.
create table public.marketing_einstellungen (
  trager_id uuid primary key references public.trager(id) on delete cascade,
  kampagne_endet_in_tagen integer not null default 7 check (kampagne_endet_in_tagen between 1 and 90),
  bewertung_veraltet_nach_tagen integer not null default 30 check (bewertung_veraltet_nach_tagen between 1 and 365),
  grenzen jsonb not null default '{}'::jsonb,
  kriterien jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null
);

alter table public.marketing_einstellungen enable row level security;

create policy marketing_einstellungen_select on public.marketing_einstellungen
  for select to authenticated
  using (trager_id = app.current_user_trager_id() and app.marketing_zugriff() <> 'kein_zugriff');

create policy marketing_einstellungen_insert on public.marketing_einstellungen
  for insert to authenticated
  with check (trager_id = app.current_user_trager_id() and app.marketing_zugriff() = 'bearbeiten');

create policy marketing_einstellungen_update on public.marketing_einstellungen
  for update to authenticated
  using (trager_id = app.current_user_trager_id() and app.marketing_zugriff() = 'bearbeiten')
  with check (trager_id = app.current_user_trager_id() and app.marketing_zugriff() = 'bearbeiten');
