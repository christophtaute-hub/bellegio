-- Milestone 29c: neuer Bereich 'finanzen' (Fördererlöse, Personalkosten, Ergebnis). Anders als
-- belegung/personal/controlling/szenario bekommt einrichtungsleitung hier KEINEN automatischen
-- Blanko-Zugriff — nur traeger_admin. Grund (Nutzerentscheidung aus Milestone 29, bestätigt):
-- "Führung sieht mehrere Einrichtungen ohne Finanzsicht" — eine einrichtungsleitung soll für
-- finanzen granular über einrichtung_berechtigungen freigeschaltet werden müssen, exakt wie ein
-- normaler mitarbeiter.

alter table public.einrichtung_berechtigungen drop constraint einrichtung_berechtigungen_bereich_check;
alter table public.einrichtung_berechtigungen
  add constraint einrichtung_berechtigungen_bereich_check
  check (bereich in ('belegung','personal','controlling','szenario','finanzen'));

-- current_user_zugriff: 'finanzen' bekommt einen eigenen Zweig VOR dem bestehenden
-- traeger_admin/einrichtungsleitung-Blanko-Zweig, damit einrichtungsleitung für 'finanzen' auf den
-- granularen Lookup durchfällt wie ein regulärer mitarbeiter. traeger_admin bleibt uneingeschränkt.
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
    when target_bereich = 'finanzen' then coalesce(
      (select eb.zugriff from public.einrichtung_berechtigungen eb
       where eb.user_id = auth.uid()
         and eb.einrichtung_id = target_einrichtung_id
         and eb.bereich = 'finanzen'),
      'kein_zugriff'
    )
    when app.current_user_role() = 'einrichtungsleitung' then 'bearbeiten'
    else coalesce(
      (select eb.zugriff from public.einrichtung_berechtigungen eb
       where eb.user_id = auth.uid()
         and eb.einrichtung_id = target_einrichtung_id
         and eb.bereich = target_bereich),
      'kein_zugriff'
    )
  end;
$$;

create function app.current_user_can_write_finanzen(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'finanzen') = 'bearbeiten';
$$;

create function app.current_user_can_view_finanzen(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select app.current_user_zugriff(target_einrichtung_id, 'finanzen') <> 'kein_zugriff';
$$;

revoke execute on function app.current_user_can_write_finanzen(uuid) from public;
revoke execute on function app.current_user_can_view_finanzen(uuid) from public;
grant execute on function app.current_user_can_write_finanzen(uuid) to authenticated;
grant execute on function app.current_user_can_view_finanzen(uuid) to authenticated;
