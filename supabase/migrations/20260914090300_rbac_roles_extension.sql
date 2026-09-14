alter table public.user_profiles drop constraint user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check
  check (role in ('traeger_admin','einrichtungsleitung','belegung','personal','controlling'));

create or replace function app.current_user_can_write_belegung()
returns boolean language sql stable security definer set search_path = app, public, pg_catalog as $$
  select app.current_user_role() in ('traeger_admin','einrichtungsleitung','belegung');
$$;

create or replace function app.current_user_can_write_personal()
returns boolean language sql stable security definer set search_path = app, public, pg_catalog as $$
  select app.current_user_role() in ('traeger_admin','einrichtungsleitung','personal');
$$;

revoke execute on function app.current_user_can_write_belegung() from public;
revoke execute on function app.current_user_can_write_personal() from public;
grant execute on function app.current_user_can_write_belegung() to authenticated;
grant execute on function app.current_user_can_write_personal() to authenticated;

-- Belegung-Schreibrechte (Kinder/Gruppen)
drop policy gruppen_insert on public.gruppen;
create policy gruppen_insert on public.gruppen
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung());

drop policy gruppen_update on public.gruppen;
create policy gruppen_update on public.gruppen
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung())
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung());

drop policy kinder_insert on public.kinder;
create policy kinder_insert on public.kinder
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung());

drop policy kinder_update on public.kinder;
create policy kinder_update on public.kinder
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung())
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_belegung());

drop policy kind_weighting_factors_insert on public.kind_weighting_factors;
create policy kind_weighting_factors_insert on public.kind_weighting_factors
  for insert to authenticated
  with check (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ) and app.current_user_can_write_belegung());

drop policy kind_weighting_factors_delete on public.kind_weighting_factors;
create policy kind_weighting_factors_delete on public.kind_weighting_factors
  for delete to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ) and app.current_user_can_write_belegung());

-- Personal-Schreibrechte (Team)
drop policy team_insert on public.team;
create policy team_insert on public.team
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_personal());

drop policy team_update on public.team;
create policy team_update on public.team
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_personal())
  with check (app.user_has_einrichtung_access(einrichtung_id) and app.current_user_can_write_personal());

drop policy team_monthly_hours_insert on public.team_monthly_hours;
create policy team_monthly_hours_insert on public.team_monthly_hours
  for insert to authenticated
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal());

drop policy team_monthly_hours_update on public.team_monthly_hours;
create policy team_monthly_hours_update on public.team_monthly_hours
  for update to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal())
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal());

drop policy team_ausfallzeiten_insert on public.team_ausfallzeiten;
create policy team_ausfallzeiten_insert on public.team_ausfallzeiten
  for insert to authenticated
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal());

drop policy team_ausfallzeiten_update on public.team_ausfallzeiten;
create policy team_ausfallzeiten_update on public.team_ausfallzeiten
  for update to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal())
  with check (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal());

drop policy team_ausfallzeiten_delete on public.team_ausfallzeiten;
create policy team_ausfallzeiten_delete on public.team_ausfallzeiten
  for delete to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ) and app.current_user_can_write_personal());
