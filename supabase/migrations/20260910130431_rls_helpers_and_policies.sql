create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated;

create or replace function app.current_user_trager_id()
returns uuid
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select trager_id from public.user_profiles where id = auth.uid();
$$;

create or replace function app.current_user_role()
returns text
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

create or replace function app.user_has_einrichtung_access(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select exists (
    select 1 from public.einrichtungen e
    where e.id = target_einrichtung_id
      and e.trager_id = app.current_user_trager_id()
      and (
        app.current_user_role() = 'traeger_admin'
        or exists (
          select 1 from public.user_einrichtungen ue
          where ue.user_id = auth.uid() and ue.einrichtung_id = target_einrichtung_id
        )
      )
  );
$$;

revoke execute on function app.current_user_trager_id() from public;
revoke execute on function app.current_user_role() from public;
revoke execute on function app.user_has_einrichtung_access(uuid) from public;
grant execute on function app.current_user_trager_id() to authenticated;
grant execute on function app.current_user_role() to authenticated;
grant execute on function app.user_has_einrichtung_access(uuid) to authenticated;

alter table public.trager enable row level security;
alter table public.einrichtungen enable row level security;
alter table public.gruppen enable row level security;
alter table public.kinder enable row level security;
alter table public.kind_weighting_factors enable row level security;
alter table public.team enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_einrichtungen enable row level security;
alter table public.booking_time_bands enable row level security;
alter table public.weighting_factors enable row level security;
alter table public.platzwert_rules enable row level security;

create policy trager_select on public.trager
  for select to authenticated
  using (id = app.current_user_trager_id());

create policy einrichtungen_select on public.einrichtungen
  for select to authenticated
  using (app.user_has_einrichtung_access(id));

create policy einrichtungen_insert on public.einrichtungen
  for insert to authenticated
  with check (trager_id = app.current_user_trager_id() and app.current_user_role() = 'traeger_admin');

create policy einrichtungen_update on public.einrichtungen
  for update to authenticated
  using (trager_id = app.current_user_trager_id() and app.current_user_role() = 'traeger_admin')
  with check (trager_id = app.current_user_trager_id() and app.current_user_role() = 'traeger_admin');

create policy gruppen_select on public.gruppen
  for select to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id));

create policy gruppen_insert on public.gruppen
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy gruppen_update on public.gruppen
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id))
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy kinder_select on public.kinder
  for select to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id));

create policy kinder_insert on public.kinder
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy kinder_update on public.kinder
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id))
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy kind_weighting_factors_select on public.kind_weighting_factors
  for select to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

create policy kind_weighting_factors_insert on public.kind_weighting_factors
  for insert to authenticated
  with check (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

create policy kind_weighting_factors_delete on public.kind_weighting_factors
  for delete to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

create policy team_select on public.team
  for select to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id));

create policy team_insert on public.team
  for insert to authenticated
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy team_update on public.team
  for update to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id))
  with check (app.user_has_einrichtung_access(einrichtung_id));

create policy user_profiles_select on public.user_profiles
  for select to authenticated
  using (id = auth.uid() or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()));

create policy user_profiles_update on public.user_profiles
  for update to authenticated
  using (id = auth.uid() or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()))
  with check (id = auth.uid() or (app.current_user_role() = 'traeger_admin' and trager_id = app.current_user_trager_id()));

create policy user_einrichtungen_select on public.user_einrichtungen
  for select to authenticated
  using (
    user_id = auth.uid()
    or (app.current_user_role() = 'traeger_admin' and exists (
      select 1 from public.einrichtungen e where e.id = einrichtung_id and e.trager_id = app.current_user_trager_id()
    ))
  );

create policy user_einrichtungen_insert on public.user_einrichtungen
  for insert to authenticated
  with check (
    app.current_user_role() = 'traeger_admin'
    and exists (select 1 from public.einrichtungen e where e.id = einrichtung_id and e.trager_id = app.current_user_trager_id())
  );

create policy user_einrichtungen_delete on public.user_einrichtungen
  for delete to authenticated
  using (
    app.current_user_role() = 'traeger_admin'
    and exists (select 1 from public.einrichtungen e where e.id = einrichtung_id and e.trager_id = app.current_user_trager_id())
  );

create policy booking_time_bands_select on public.booking_time_bands
  for select to authenticated using (true);

create policy weighting_factors_select on public.weighting_factors
  for select to authenticated using (true);

create policy platzwert_rules_select on public.platzwert_rules
  for select to authenticated using (true);
