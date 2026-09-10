create index kind_weighting_factors_weighting_factor_id_idx on public.kind_weighting_factors(weighting_factor_id);
create index kinder_buchungszeit_band_id_idx on public.kinder(buchungszeit_band_id);
create index team_gruppe_id_idx on public.team(gruppe_id);

drop policy user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()));

drop policy user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
  for update to authenticated
  using (id = (select auth.uid()) or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()))
  with check (id = (select auth.uid()) or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()));

drop policy user_einrichtungen_select on public.user_einrichtungen;
create policy user_einrichtungen_select on public.user_einrichtungen
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (app.current_user_role() = 'traeger_admin' and exists (
      select 1 from public.einrichtungen e where e.id = einrichtung_id and e.trager_id = app.current_user_trager_id()
    ))
  );
