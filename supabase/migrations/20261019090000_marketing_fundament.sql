-- Milestone 35, M1: Marketing-Ampel — Fundament (Zugriff, Helfer, Stammdaten-RPCs, Protokoll).
-- Bewusst eigenständig: keine Änderung an bestehenden Tabellen oder Policies. Marketing-Nutzer bekommen KEINEN Zugriff auf
-- Kinder, Team oder die Tabelle einrichtungen — Stammdaten kommen ausschließlich über die RPC marketing_einrichtungen().

-- 1. Trägerweites Marketing-Recht je Nutzer (Träger-Admin hat es immer, ohne Eintrag).
create table public.marketing_zugang (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  trager_id uuid not null references public.trager(id) on delete cascade,
  zugriff text not null check (zugriff in ('ansehen', 'bearbeiten')),
  created_at timestamptz not null default now()
);

alter table public.marketing_zugang enable row level security;

create policy marketing_zugang_select on public.marketing_zugang
  for select to authenticated
  using (
    user_id = auth.uid()
    or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id())
  );

create policy marketing_zugang_insert on public.marketing_zugang
  for insert to authenticated
  with check (
    app.current_user_role() = 'traeger_admin'
    and trager_id = app.current_user_trager_id()
    and exists (select 1 from public.user_profiles u where u.id = user_id and u.trager_id = marketing_zugang.trager_id)
  );

create policy marketing_zugang_update on public.marketing_zugang
  for update to authenticated
  using (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id())
  with check (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id());

create policy marketing_zugang_delete on public.marketing_zugang
  for delete to authenticated
  using (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id());

-- 2. Helfer: Stufe des aufrufenden Nutzers und Einrichtungsprüfung. Security definer, damit Marketing-Nutzer die Tabelle
-- einrichtungen nicht lesen müssen; die Träger-Zugehörigkeit wird hier geprüft.
create or replace function app.marketing_zugriff()
returns text
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select case
    when app.current_user_role() = 'traeger_admin' then 'bearbeiten'
    else coalesce(
      (select z.zugriff from public.marketing_zugang z
        where z.user_id = auth.uid() and z.trager_id = app.current_user_trager_id()),
      'kein_zugriff'
    )
  end
$$;

create or replace function app.marketing_darf(p_einrichtung_id uuid, p_stufe text)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select exists (
      select 1 from public.einrichtungen e
      where e.id = p_einrichtung_id and e.trager_id = app.current_user_trager_id()
    )
    and case p_stufe
      when 'bearbeiten' then app.marketing_zugriff() = 'bearbeiten'
      else app.marketing_zugriff() in ('ansehen', 'bearbeiten')
    end
$$;

revoke execute on function app.marketing_zugriff() from public;
revoke execute on function app.marketing_darf(uuid, text) from public;
grant execute on function app.marketing_zugriff() to authenticated;
grant execute on function app.marketing_darf(uuid, text) to authenticated;

-- 3. RPCs für die Oberfläche (self-guarded): nur Stammdaten der aktiven Einrichtungen des eigenen Trägers bzw. Nutzernamen.
create or replace function public.marketing_einrichtungen()
returns table (id uuid, name text, kostenstelle text, cluster text, bundesland_code text, ort text)
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select e.id, e.name, e.kostenstelle, e.cluster, e.bundesland_code, e.address_city
  from public.einrichtungen e
  where app.marketing_zugriff() <> 'kein_zugriff'
    and e.trager_id = app.current_user_trager_id()
    and e.archived_at is null
  order by e.name
$$;

create or replace function public.marketing_nutzer()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select p.id, p.full_name
  from public.user_profiles p
  where app.marketing_zugriff() <> 'kein_zugriff'
    and p.trager_id = app.current_user_trager_id()
  order by p.full_name
$$;

revoke execute on function public.marketing_einrichtungen() from public, anon;
revoke execute on function public.marketing_nutzer() from public, anon;
grant execute on function public.marketing_einrichtungen() to authenticated;
grant execute on function public.marketing_nutzer() to authenticated;

-- 4. Protokoll aller Änderungen an Marketing-Daten (wer, wann, was). Wird per Trigger geschrieben, nie von der App.
create table public.marketing_protokoll (
  id uuid primary key default gen_random_uuid(),
  tabelle text not null,
  datensatz_id uuid,
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  aktion text not null,
  alt jsonb,
  neu jsonb,
  geaendert_von uuid references public.user_profiles(id) on delete set null,
  geaendert_am timestamptz not null default now()
);
create index marketing_protokoll_einrichtung_idx on public.marketing_protokoll (einrichtung_id, geaendert_am desc);

alter table public.marketing_protokoll enable row level security;

create policy marketing_protokoll_select on public.marketing_protokoll
  for select to authenticated
  using (app.marketing_darf(einrichtung_id, 'ansehen'));

create or replace function app.marketing_protokollieren()
returns trigger
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
declare
  zeile jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.marketing_protokoll (tabelle, datensatz_id, einrichtung_id, aktion, alt, neu, geaendert_von)
  values (
    tg_table_name,
    coalesce(zeile ->> 'id', zeile ->> 'einrichtung_id')::uuid,
    (zeile ->> 'einrichtung_id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function app.marketing_protokollieren() from public, anon, authenticated;
