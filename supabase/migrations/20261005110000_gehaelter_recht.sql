-- Milestone 33, Phase 3: Einzelgehälter als eigenes Recht 'gehaelter', getrennt von der Finanzübersicht ('finanzen').
-- * 'finanzen'  = Summen: Fördererlöse, Personalkosten gesamt, Ergebnis (aggregiert).
-- * 'gehaelter' = die Vergütung einzelner Mitarbeitender (Entgeltgruppe/Stufe/Monatsgehalt) samt Änderungsprotokoll.
-- Standard: nur der Träger-Admin; die Einrichtungsleitung hat weder 'finanzen' noch 'gehaelter', es sei denn, sie wird
-- ausdrücklich freigeschaltet.
-- Neu: auch die Einrichtungsleitung lässt sich je Einrichtung und Bereich einstellen. Ohne eigene Zeile gilt der bisherige
-- Standard (alles außer finanzen/gehaelter = bearbeiten); eine Zeile in einrichtung_berechtigungen überschreibt ihn.

alter table public.einrichtung_berechtigungen drop constraint einrichtung_berechtigungen_bereich_check;
alter table public.einrichtung_berechtigungen
  add constraint einrichtung_berechtigungen_bereich_check
  check (bereich in ('belegung','personal','controlling','szenario','finanzen','gehaelter'));

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
    when app.current_user_role() = 'traeger_admin' then 'bearbeiten'
    when app.current_user_role() = 'einrichtungsleitung' then coalesce(
      (select eb.zugriff from public.einrichtung_berechtigungen eb
       where eb.user_id = auth.uid()
         and eb.einrichtung_id = target_einrichtung_id
         and eb.bereich = target_bereich),
      case when target_bereich in ('finanzen', 'gehaelter') then 'kein_zugriff' else 'bearbeiten' end
    )
    else coalesce(
      (select eb.zugriff from public.einrichtung_berechtigungen eb
       where eb.user_id = auth.uid()
         and eb.einrichtung_id = target_einrichtung_id
         and eb.bereich = target_bereich),
      'kein_zugriff'
    )
  end;
$$;

create function app.current_user_can_view_gehaelter(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'gehaelter') <> 'kein_zugriff';
$$;

create function app.current_user_can_write_gehaelter(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'gehaelter') = 'bearbeiten';
$$;

revoke execute on function app.current_user_can_view_gehaelter(uuid) from public;
revoke execute on function app.current_user_can_write_gehaelter(uuid) from public;
grant execute on function app.current_user_can_view_gehaelter(uuid) to authenticated;
grant execute on function app.current_user_can_write_gehaelter(uuid) to authenticated;

-- Einzelgehälter und ihr Protokoll hängen jetzt am Recht 'gehaelter'.
drop policy team_verguetung_select on public.team_verguetung;
drop policy team_verguetung_insert on public.team_verguetung;
drop policy team_verguetung_update on public.team_verguetung;
drop policy team_verguetung_delete on public.team_verguetung;
drop policy team_verguetung_audit_log_select on public.team_verguetung_audit_log;

create policy team_verguetung_select on public.team_verguetung
  for select to authenticated
  using (app.current_user_can_view_gehaelter(einrichtung_id));

create policy team_verguetung_insert on public.team_verguetung
  for insert to authenticated
  with check (
    app.current_user_can_write_gehaelter(einrichtung_id)
    and exists (select 1 from public.team t where t.id = team_verguetung.team_id and t.einrichtung_id = team_verguetung.einrichtung_id)
  );

create policy team_verguetung_update on public.team_verguetung
  for update to authenticated
  using (app.current_user_can_write_gehaelter(einrichtung_id))
  with check (
    app.current_user_can_write_gehaelter(einrichtung_id)
    and exists (select 1 from public.team t where t.id = team_verguetung.team_id and t.einrichtung_id = team_verguetung.einrichtung_id)
  );

create policy team_verguetung_delete on public.team_verguetung
  for delete to authenticated
  using (app.current_user_can_write_gehaelter(einrichtung_id));

create policy team_verguetung_audit_log_select on public.team_verguetung_audit_log
  for select to authenticated
  using (app.current_user_can_view_gehaelter(einrichtung_id));

-- Niemand verliert Zugriff: wer bisher 'finanzen' hatte, bekommt dieselbe Stufe auf 'gehaelter'. Danach lässt sich beides getrennt
-- einstellen (z. B. Finanzübersicht ja, Einzelgehälter nein).
insert into public.einrichtung_berechtigungen (user_id, einrichtung_id, bereich, zugriff)
select user_id, einrichtung_id, 'gehaelter', zugriff
from public.einrichtung_berechtigungen
where bereich = 'finanzen'
on conflict (user_id, einrichtung_id, bereich) do nothing;
