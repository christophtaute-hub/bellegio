-- 1. Neue Tabelle für granulare, pro Einrichtung + Bereich vergebene Rechte.
create table public.einrichtung_berechtigungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  bereich text not null check (bereich in ('belegung','personal','controlling','szenario')),
  zugriff text not null check (zugriff in ('kein_zugriff','ansehen','bearbeiten')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, einrichtung_id, bereich)
);

alter table public.user_profiles
  add column kann_rechte_verwalten boolean not null default false;

-- 2. Sicherheitslücke schließen: bisher konnte sich jeder Nutzer über die
-- bestehende user_profiles-Update-Policy (id = auth.uid()) selbst zum
-- traeger_admin befördern, da die Policy nicht spaltenscharf war. Ein
-- Trigger verbietet Änderungen an role/trager_id/kann_rechte_verwalten
-- durch alle außer einem traeger_admin desselben Trägers.
create or replace function app.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
begin
  if (new.role is distinct from old.role
      or new.trager_id is distinct from old.trager_id
      or new.kann_rechte_verwalten is distinct from old.kann_rechte_verwalten)
     and not (
       app.current_user_role() = 'traeger_admin'
       and old.trager_id = app.current_user_trager_id()
     )
  then
    raise exception 'Nur ein Träger-Admin darf Rolle, Träger-Zuordnung oder Rechte-Verwaltung ändern.';
  end if;
  return new;
end;
$$;

create trigger user_profiles_prevent_self_escalation
  before update on public.user_profiles
  for each row execute function app.prevent_self_role_escalation();

-- 3. Rang-Helfer für "nicht mehr vergeben als man selbst hat".
create or replace function app.zugriff_rang(zugriff text)
returns int
language sql
immutable
set search_path = app, public, pg_catalog
as $$
  select case zugriff when 'bearbeiten' then 2 when 'ansehen' then 1 else 0 end;
$$;

-- 4. Effektiver Zugriff eines Nutzers auf einen Bereich einer Einrichtung.
create or replace function app.current_user_zugriff(target_einrichtung_id uuid, target_bereich text)
returns text
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select case
    when not exists (
      select 1 from public.einrichtungen e
      where e.id = target_einrichtung_id and e.trager_id = app.current_user_trager_id()
    ) then 'kein_zugriff'
    when app.current_user_role() in ('traeger_admin', 'einrichtungsleitung') then 'bearbeiten'
    else coalesce(
      (select eb.zugriff from public.einrichtung_berechtigungen eb
       where eb.user_id = auth.uid()
         and eb.einrichtung_id = target_einrichtung_id
         and eb.bereich = target_bereich),
      'kein_zugriff'
    )
  end;
$$;

-- 5. user_has_einrichtung_access: granulare Tabelle statt user_einrichtungen
-- (bisher ungenutzt — es gab nie eine UI dafür). Jede Zugriffsstufe außer
-- "kein_zugriff", in irgendeinem Bereich, gewährt grundsätzliche Sichtbarkeit
-- der Einrichtung (Lesezugriff bleibt einrichtungsweit vereinheitlicht,
-- Schreibzugriff wird unten separat je Bereich geprüft).
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
        app.current_user_role() in ('traeger_admin', 'einrichtungsleitung')
        or exists (
          select 1 from public.einrichtung_berechtigungen eb
          where eb.user_id = auth.uid()
            and eb.einrichtung_id = target_einrichtung_id
            and eb.zugriff <> 'kein_zugriff'
        )
      )
  );
$$;

-- 6. Bestehende Schreib-Policies auf gruppen/kinder/kind_weighting_factors/
-- team/team_monthly_hours/team_ausfallzeiten entfernen, bevor die
-- referenzierten Funktionen mit neuer Signatur (jetzt mit einrichtung_id-
-- Parameter statt trägerweiter Rolle) neu angelegt werden.
drop policy gruppen_insert on public.gruppen;
drop policy gruppen_update on public.gruppen;
drop policy kind_weighting_factors_delete on public.kind_weighting_factors;
drop policy kind_weighting_factors_insert on public.kind_weighting_factors;
drop policy kinder_insert on public.kinder;
drop policy kinder_update on public.kinder;
drop policy team_insert on public.team;
drop policy team_update on public.team;
drop policy team_ausfallzeiten_delete on public.team_ausfallzeiten;
drop policy team_ausfallzeiten_insert on public.team_ausfallzeiten;
drop policy team_ausfallzeiten_update on public.team_ausfallzeiten;
drop policy team_monthly_hours_insert on public.team_monthly_hours;
drop policy team_monthly_hours_update on public.team_monthly_hours;

drop function app.current_user_can_write_belegung();
drop function app.current_user_can_write_personal();

create function app.current_user_can_write_belegung(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'belegung') = 'bearbeiten';
$$;

create function app.current_user_can_write_personal(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'personal') = 'bearbeiten';
$$;

-- 7. Policies mit neuer Signatur wiederherstellen.
create policy gruppen_insert on public.gruppen
  for insert to authenticated
  with check (app.current_user_can_write_belegung(einrichtung_id));
create policy gruppen_update on public.gruppen
  for update to authenticated
  using (app.current_user_can_write_belegung(einrichtung_id))
  with check (app.current_user_can_write_belegung(einrichtung_id));

create policy kinder_insert on public.kinder
  for insert to authenticated
  with check (app.current_user_can_write_belegung(einrichtung_id));
create policy kinder_update on public.kinder
  for update to authenticated
  using (app.current_user_can_write_belegung(einrichtung_id))
  with check (app.current_user_can_write_belegung(einrichtung_id));

create policy kind_weighting_factors_insert on public.kind_weighting_factors
  for insert to authenticated
  with check (
    exists (select 1 from public.kinder k where k.id = kind_weighting_factors.kind_id and app.current_user_can_write_belegung(k.einrichtung_id))
  );
create policy kind_weighting_factors_delete on public.kind_weighting_factors
  for delete to authenticated
  using (
    exists (select 1 from public.kinder k where k.id = kind_weighting_factors.kind_id and app.current_user_can_write_belegung(k.einrichtung_id))
  );

create policy team_insert on public.team
  for insert to authenticated
  with check (app.current_user_can_write_personal(einrichtung_id));
create policy team_update on public.team
  for update to authenticated
  using (app.current_user_can_write_personal(einrichtung_id))
  with check (app.current_user_can_write_personal(einrichtung_id));

create policy team_monthly_hours_insert on public.team_monthly_hours
  for insert to authenticated
  with check (
    exists (select 1 from public.team t where t.id = team_monthly_hours.team_id and app.current_user_can_write_personal(t.einrichtung_id))
  );
create policy team_monthly_hours_update on public.team_monthly_hours
  for update to authenticated
  using (exists (select 1 from public.team t where t.id = team_monthly_hours.team_id and app.current_user_can_write_personal(t.einrichtung_id)))
  with check (exists (select 1 from public.team t where t.id = team_monthly_hours.team_id and app.current_user_can_write_personal(t.einrichtung_id)));

create policy team_ausfallzeiten_insert on public.team_ausfallzeiten
  for insert to authenticated
  with check (
    exists (select 1 from public.team t where t.id = team_ausfallzeiten.team_id and app.current_user_can_write_personal(t.einrichtung_id))
  );
create policy team_ausfallzeiten_update on public.team_ausfallzeiten
  for update to authenticated
  using (exists (select 1 from public.team t where t.id = team_ausfallzeiten.team_id and app.current_user_can_write_personal(t.einrichtung_id)))
  with check (exists (select 1 from public.team t where t.id = team_ausfallzeiten.team_id and app.current_user_can_write_personal(t.einrichtung_id)));
create policy team_ausfallzeiten_delete on public.team_ausfallzeiten
  for delete to authenticated
  using (
    exists (select 1 from public.team t where t.id = team_ausfallzeiten.team_id and app.current_user_can_write_personal(t.einrichtung_id))
  );

-- 8. RLS auf der neuen Rechte-Tabelle selbst.
alter table public.einrichtung_berechtigungen enable row level security;

create policy einrichtung_berechtigungen_select on public.einrichtung_berechtigungen
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from public.user_profiles up
        where up.id = einrichtung_berechtigungen.user_id
          and up.trager_id = app.current_user_trager_id()
      )
      and (
        app.current_user_role() = 'traeger_admin'
        or coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
      )
    )
  );

create policy einrichtung_berechtigungen_insert on public.einrichtung_berechtigungen
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_berechtigungen.user_id
        and up.trager_id = app.current_user_trager_id()
    )
    and (
      app.current_user_role() = 'traeger_admin'
      or (
        coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
        and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
      )
    )
  );

create policy einrichtung_berechtigungen_update on public.einrichtung_berechtigungen
  for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_berechtigungen.user_id
        and up.trager_id = app.current_user_trager_id()
    )
    and (
      app.current_user_role() = 'traeger_admin'
      or coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
    )
  )
  with check (
    app.current_user_role() = 'traeger_admin'
    or app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
  );

create policy einrichtung_berechtigungen_delete on public.einrichtung_berechtigungen
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_berechtigungen.user_id
        and up.trager_id = app.current_user_trager_id()
    )
    and (
      app.current_user_role() = 'traeger_admin'
      or (
        coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
        and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
      )
    )
  );
