create table public.team_ausfallzeiten (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team(id) on delete cascade,
  art text not null check (art in ('mutterschutz','schwangerschaft','krankheit','sonderurlaub','sonstiges')),
  von date not null,
  bis date,
  notizen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index team_ausfallzeiten_team_id_idx on public.team_ausfallzeiten(team_id);

create trigger team_ausfallzeiten_set_updated_at
  before update on public.team_ausfallzeiten
  for each row execute function public.set_updated_at();

alter table public.team_ausfallzeiten enable row level security;

create policy team_ausfallzeiten_select on public.team_ausfallzeiten
  for select to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ));

create policy team_ausfallzeiten_insert on public.team_ausfallzeiten
  for insert to authenticated
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ));

create policy team_ausfallzeiten_update on public.team_ausfallzeiten
  for update to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ))
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ));

create policy team_ausfallzeiten_delete on public.team_ausfallzeiten
  for delete to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ));

-- team_presence_for_month: Wochenstunden auf 0, wenn eine Ausfallzeit den
-- kompletten Monat überdeckt (keine anteilige Berechnung bei Teil-Überlappung).
create or replace function public.team_presence_for_month(
  p_einrichtung_id uuid,
  p_month date
)
returns table (
  team_id uuid,
  vorname text,
  nachname text,
  rolle text,
  role_category text,
  wochenstunden numeric
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with bounds as (
    select date_trunc('month', p_month)::date as month_start,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as month_end
  )
  select t.id, t.vorname, t.nachname, t.rolle, t.role_category,
         case
           when exists (
             select 1 from public.team_ausfallzeiten az, bounds b
             where az.team_id = t.id
               and az.von <= b.month_start
               and (az.bis is null or az.bis >= b.month_end)
           ) then 0
           else coalesce(tmh.wochenstunden, t.wochenstunden, 0)
         end as wochenstunden
  from public.team t
  cross join bounds b
  left join public.team_monthly_hours tmh
    on tmh.team_id = t.id and tmh.month = b.month_start
  where t.einrichtung_id = p_einrichtung_id
    and t.archived_at is null
    and t.eintritt is not null
    and t.eintritt <= b.month_end
    and (t.austritt is null or t.austritt > b.month_start)
$$;
revoke execute on function public.team_presence_for_month(uuid, date) from public;
grant execute on function public.team_presence_for_month(uuid, date) to authenticated;
