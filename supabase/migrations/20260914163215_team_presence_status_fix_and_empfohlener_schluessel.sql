-- Bugfix: 21 von 22 echten Mitarbeiter:innen haben kein `eintritt`-Datum
-- gesetzt (Quell-Excel hatte für Personal keine Eintritt-Spalte). Bisher
-- verlangten team_presence_for_month/team_presence_at_date zwingend ein
-- gesetztes eintritt, wodurch fast alle echten Mitarbeiter:innen aus der
-- Anstellungsschlüssel-Berechnung herausfielen. status='aktiv' wird jetzt
-- das primäre Anwesenheitskriterium; eintritt/austritt verfeinern nur noch,
-- wenn gesetzt.
alter table public.einrichtungen
  add column empfohlener_anstellungsschluessel numeric(4,1) not null default 10.0
    check (empfohlener_anstellungsschluessel > 0);

drop function if exists public.team_presence_for_month(uuid, date);

create function public.team_presence_for_month(p_einrichtung_id uuid, p_month date)
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
    and t.status = 'aktiv'
    and (t.eintritt is null or t.eintritt <= b.month_end)
    and (t.austritt is null or t.austritt > b.month_start)
$$;

drop function if exists public.team_presence_at_date(uuid, date);

create function public.team_presence_at_date(p_einrichtung_id uuid, p_stichtag date)
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
set search_path = public, pg_catalog
as $$
  select t.id, t.vorname, t.nachname, t.rolle, t.wochenstunden, t.fachkraft
  from public.team t
  where t.einrichtung_id = p_einrichtung_id
    and t.archived_at is null
    and t.status = 'aktiv'
    and (t.eintritt is null or t.eintritt <= p_stichtag)
    and (t.austritt is null or t.austritt > p_stichtag)
$$;
