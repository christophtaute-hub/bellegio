-- Milestone 33, Phase 5b: gespeicherte Kitajahr-Planung (ein Plan je Einrichtung und Kitajahr). Recht: Bereich 'szenario'.
create table public.kitajahr_planung (
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  kitajahr_start date not null,
  daten jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (einrichtung_id, kitajahr_start)
);

alter table public.kitajahr_planung enable row level security;

create policy kitajahr_planung_select on public.kitajahr_planung
  for select to authenticated using (app.current_user_zugriff(einrichtung_id, 'szenario') <> 'kein_zugriff');
create policy kitajahr_planung_insert on public.kitajahr_planung
  for insert to authenticated with check (app.current_user_zugriff(einrichtung_id, 'szenario') = 'bearbeiten');
create policy kitajahr_planung_update on public.kitajahr_planung
  for update to authenticated
  using (app.current_user_zugriff(einrichtung_id, 'szenario') = 'bearbeiten')
  with check (app.current_user_zugriff(einrichtung_id, 'szenario') = 'bearbeiten');
create policy kitajahr_planung_delete on public.kitajahr_planung
  for delete to authenticated using (app.current_user_zugriff(einrichtung_id, 'szenario') = 'bearbeiten');
