-- Milestone 23: Datenschutz-Funktionen (Löschen/Anonymisieren mit Protokoll), öffentliche Betreiberangaben
-- für Impressum/Datenschutz, Zustimmung der Träger-Administration zu AGB und AVV.

-- 1. Löschfrist je Einrichtung (Erinnerung, keine automatische Löschung). null = keine Erinnerung.
alter table public.einrichtungen
  add column loeschfrist_monate smallint check (loeschfrist_monate between 1 and 240);

-- 2. Löschprotokoll: wer hat wann welchen Datensatz gelöscht oder anonymisiert (ohne personenbezogene Inhalte).
create table public.loeschprotokoll (
  id uuid primary key default gen_random_uuid(),
  trager_id uuid not null references public.trager(id) on delete cascade,
  einrichtung_id uuid references public.einrichtungen(id) on delete set null,
  art text not null check (art in ('kind', 'team')),
  aktion text not null check (aktion in ('geloescht', 'anonymisiert')),
  objekt_id uuid not null,
  durch uuid,
  zeitpunkt timestamptz not null default now()
);
create index loeschprotokoll_trager_idx on public.loeschprotokoll (trager_id, zeitpunkt desc);
alter table public.loeschprotokoll enable row level security;

create policy loeschprotokoll_lesen on public.loeschprotokoll
  for select to authenticated
  using (trager_id = (select app.current_user_trager_id()) and (select app.current_user_role()) = 'traeger_admin');
-- Bewusst keine Insert-/Update-/Delete-Policy: Einträge entstehen nur durch die Funktionen unten.

-- 3. Öffentliche Betreiberangaben (Impressum, Datenschutz, AGB, AVV). Eine Zeile, für alle lesbar, nur der Betreiber ändert.
create table public.betreiber_oeffentlich (
  id boolean primary key default true check (id),
  firmenname text,
  anschrift text,
  email text,
  telefon text,
  vertretungsberechtigt text,
  registergericht text,
  registernummer text,
  ust_id text,
  inhaltlich_verantwortlich text,
  datenschutz_email text,
  aufsichtsbehoerde text,
  aufbewahrung_anfragen_monate smallint not null default 6 check (aufbewahrung_anfragen_monate between 1 and 60),
  updated_at timestamptz not null default now()
);
insert into public.betreiber_oeffentlich (id) values (true);
alter table public.betreiber_oeffentlich enable row level security;

create policy betreiber_oeffentlich_lesen on public.betreiber_oeffentlich
  for select to anon, authenticated
  using (true);
create policy betreiber_oeffentlich_aendern on public.betreiber_oeffentlich
  for update to authenticated
  using ((select app.is_platform_operator()))
  with check ((select app.is_platform_operator()));

-- 4. Zustimmung der Träger-Administration zu AGB und AVV (mit Version und Zeitstempel).
create table public.vertragszustimmungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trager_id uuid not null references public.trager(id) on delete cascade,
  dokument text not null check (dokument in ('agb', 'avv')),
  version text not null check (char_length(version) between 1 and 40),
  zugestimmt_am timestamptz not null default now(),
  unique (user_id, dokument, version)
);
alter table public.vertragszustimmungen enable row level security;

create policy vertragszustimmungen_lesen on public.vertragszustimmungen
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (trager_id = (select app.current_user_trager_id()) and (select app.current_user_role()) = 'traeger_admin')
    or (select app.is_platform_operator())
  );
create policy vertragszustimmungen_zustimmen on public.vertragszustimmungen
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and trager_id = (select app.current_user_trager_id())
    and (select app.current_user_role()) = 'traeger_admin'
  );

-- 5. Löschen und Anonymisieren. Die Funktionen brauchen Definer-Rechte (es gibt keine Delete-Policy, und die
-- Änderungsprotokolle enthalten komplette Datensätze und müssen mit bereinigt werden). Sie prüfen selbst, dass
-- der Aufrufer Träger-Administrator des betroffenen Trägers ist, und liegen deshalb im nicht per API
-- exponierten Schema app; öffentlich gibt es nur SECURITY-INVOKER-Wrapper.
create or replace function app.kind_datenschutz(p_kind_id uuid, p_aktion text)
returns void
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
declare
  k public.kinder%rowtype;
  v_trager uuid;
begin
  if p_aktion not in ('loeschen', 'anonymisieren') then
    raise exception 'Unbekannte Aktion.';
  end if;

  select * into k from public.kinder where id = p_kind_id;
  if not found then raise exception 'Kind nicht gefunden.'; end if;
  select trager_id into v_trager from public.einrichtungen where id = k.einrichtung_id;

  if app.current_user_role() is distinct from 'traeger_admin' or v_trager is distinct from app.current_user_trager_id() then
    raise exception 'Nur die Träger-Administration darf Kinderdaten löschen oder anonymisieren.';
  end if;
  if k.status = 'aktiv' and not (k.austritt is not null and k.austritt <= current_date) then
    raise exception 'Nur ausgetretene Kinder sowie Nachrücker und geplante Kinder können gelöscht oder anonymisiert werden.';
  end if;

  if p_aktion = 'loeschen' then
    delete from public.kinder where id = p_kind_id; -- Änderungsprotokoll und Gewichtungen folgen per Cascade
  else
    if k.vorname = 'Anonym' and k.nachname = 'Kind' then
      raise exception 'Dieses Kind ist bereits anonymisiert.';
    end if;
    update public.kinder
       set vorname = 'Anonym',
           nachname = 'Kind',
           geburtsdatum = make_date(extract(year from k.geburtsdatum)::int, 7, 1), -- nur noch das Geburtsjahr (Jahresmitte)
           notizen = null,
           wohnort = null,
           platznummer = null,
           vertrag_gueltig_bis = null
     where id = p_kind_id;
    delete from public.kinder_audit_log where kind_id = p_kind_id; -- enthält die Klarnamen aus dem Zeitraum davor
  end if;

  insert into public.loeschprotokoll (trager_id, einrichtung_id, art, aktion, objekt_id, durch)
  values (v_trager, k.einrichtung_id, 'kind', case p_aktion when 'loeschen' then 'geloescht' else 'anonymisiert' end, p_kind_id, auth.uid());
end;
$$;

create or replace function app.team_datenschutz(p_team_id uuid, p_aktion text)
returns void
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
declare
  t public.team%rowtype;
  v_trager uuid;
begin
  if p_aktion not in ('loeschen', 'anonymisieren') then
    raise exception 'Unbekannte Aktion.';
  end if;

  select * into t from public.team where id = p_team_id;
  if not found then raise exception 'Person nicht gefunden.'; end if;
  select trager_id into v_trager from public.einrichtungen where id = t.einrichtung_id;

  if app.current_user_role() is distinct from 'traeger_admin' or v_trager is distinct from app.current_user_trager_id() then
    raise exception 'Nur die Träger-Administration darf Personaldaten löschen oder anonymisieren.';
  end if;
  if t.status = 'aktiv' and not (t.austritt is not null and t.austritt <= current_date) then
    raise exception 'Nur ausgeschiedenes oder inaktives Personal kann gelöscht oder anonymisiert werden.';
  end if;

  if p_aktion = 'loeschen' then
    delete from public.team where id = p_team_id; -- Protokoll, Ausfallzeiten und Monatsstunden folgen per Cascade
  else
    if t.vorname = 'Anonym' and t.nachname = 'Mitarbeiter' then
      raise exception 'Diese Person ist bereits anonymisiert.';
    end if;
    update public.team set vorname = 'Anonym', nachname = 'Mitarbeiter' where id = p_team_id;
    -- Ausfallzeiten bleiben für die Personalrechnung vergangener Monate erhalten, verlieren aber den Grund (Gesundheitsdaten).
    update public.team_ausfallzeiten set art = 'sonstiges', notizen = null where team_id = p_team_id;
    delete from public.team_audit_log where team_id = p_team_id;
  end if;

  insert into public.loeschprotokoll (trager_id, einrichtung_id, art, aktion, objekt_id, durch)
  values (v_trager, t.einrichtung_id, 'team', case p_aktion when 'loeschen' then 'geloescht' else 'anonymisiert' end, p_team_id, auth.uid());
end;
$$;

revoke execute on function app.kind_datenschutz(uuid, text) from public, anon;
revoke execute on function app.team_datenschutz(uuid, text) from public, anon;
grant execute on function app.kind_datenschutz(uuid, text) to authenticated;
grant execute on function app.team_datenschutz(uuid, text) to authenticated;

create or replace function public.kind_datenschutz(p_kind_id uuid, p_aktion text)
returns void
language sql
set search_path = public, app, pg_catalog
as $$ select app.kind_datenschutz(p_kind_id, p_aktion); $$;

create or replace function public.team_datenschutz(p_team_id uuid, p_aktion text)
returns void
language sql
set search_path = public, app, pg_catalog
as $$ select app.team_datenschutz(p_team_id, p_aktion); $$;

revoke execute on function public.kind_datenschutz(uuid, text) from public, anon;
revoke execute on function public.team_datenschutz(uuid, text) from public, anon;
grant execute on function public.kind_datenschutz(uuid, text) to authenticated;
grant execute on function public.team_datenschutz(uuid, text) to authenticated;
