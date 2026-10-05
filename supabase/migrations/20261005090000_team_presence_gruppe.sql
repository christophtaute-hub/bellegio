-- Milestone 33, Phase 1: Personalbestand je Monat liefert zusätzlich die Gruppe der Person.
-- Grundlage für Personal-Ist je Gruppe (Gruppen-Ampel im Dashboard). Personal ohne Gruppe bleibt `null`
-- (= Einrichtungsebene) und wird nicht stillschweigend auf Gruppen verteilt.
-- Der Rückgabetyp ändert sich, daher drop + create statt create or replace.

drop function if exists public.team_presence_for_month(uuid, date);

create function public.team_presence_for_month(p_einrichtung_id uuid, p_month date)
 returns table(team_id uuid, vorname text, nachname text, rolle text, role_category text, wochenstunden numeric, gruppe_id uuid)
 language sql
 stable
 set search_path to 'public', 'pg_catalog'
as $function$
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
         end as wochenstunden,
         t.gruppe_id
  from public.team t
  cross join bounds b
  left join public.team_monthly_hours tmh
    on tmh.team_id = t.id and tmh.month = b.month_start
  where t.einrichtung_id = p_einrichtung_id
    and t.archived_at is null
    and t.status = 'aktiv'
    and (t.eintritt is null or t.eintritt <= b.month_end)
    and (t.austritt is null or t.austritt > b.month_start)
$function$;

revoke execute on function public.team_presence_for_month(uuid, date) from public, anon;
grant execute on function public.team_presence_for_month(uuid, date) to authenticated;
