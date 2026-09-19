-- rechnung_freigeben braucht keine Definer-Rechte: der Betreiber darf alle beteiligten Tabellen per Policy lesen/schreiben.
create policy rechnungsnummern_operator on public.rechnungsnummern
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());

alter function public.rechnung_freigeben(uuid) security invoker;

-- operator_kennzahlen muss Kinder über Träger hinweg zählen (RLS-Bypass nötig) und liegt deshalb
-- im nicht per API exponierten Schema app; öffentlich gibt es nur einen SECURITY-INVOKER-Wrapper.
alter function public.operator_kennzahlen(date) set schema app;

create or replace function public.operator_kennzahlen(p_stichtag date)
returns table (
  trager_id uuid,
  trager_name text,
  einrichtung_id uuid,
  einrichtung_name text,
  bundesland_code text,
  aktive_kinder integer,
  gruppen integer
)
language sql
stable
set search_path = public, app, pg_catalog
as $$
  select * from app.operator_kennzahlen(p_stichtag);
$$;

revoke execute on function public.operator_kennzahlen(date) from public, anon;
grant execute on function public.operator_kennzahlen(date) to authenticated;
