alter table public.einrichtungen
  add column vollzeit_wochenstunden numeric(4,2) not null default 39.00
  check (vollzeit_wochenstunden > 0);

create or replace function public.team_presence_at_date(
  p_einrichtung_id uuid,
  p_stichtag date
)
returns table (
  team_id uuid,
  vorname text,
  nachname text,
  rolle text,
  wochenstunden numeric,
  fachkraft boolean
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select t.id, t.vorname, t.nachname, t.rolle, t.wochenstunden, t.fachkraft
  from public.team t
  where t.einrichtung_id = p_einrichtung_id
    and t.archived_at is null
    and t.eintritt is not null
    and t.eintritt <= p_stichtag
    and (t.austritt is null or t.austritt > p_stichtag)
$$;

revoke execute on function public.team_presence_at_date(uuid, date) from public;
grant execute on function public.team_presence_at_date(uuid, date) to authenticated;
