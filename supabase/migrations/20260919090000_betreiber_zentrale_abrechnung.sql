-- Milestone 18: Betreiber-Zentrale (Einnahmen + Rechnungen).
-- Der Betreiber (Bellegio-Team) ist von den Kunden-Rollen in user_profiles
-- getrennt: jeder bestehende Helper geht von genau einem Träger pro Nutzer
-- aus. Cross-Träger-Zugriff bekommt der Betreiber nur auf Stammdaten
-- (trager/einrichtungen) und über eine self-guarded RPC auf Aggregate —
-- nie auf Kinder-/Personaldaten.

-- 1. Betreiber-Rolle --------------------------------------------------------

create table public.platform_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_operators enable row level security;
create policy platform_operators_select_self on public.platform_operators
  for select to authenticated using (user_id = auth.uid());

create or replace function app.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select exists (select 1 from public.platform_operators where user_id = auth.uid());
$$;
revoke execute on function app.is_platform_operator() from public;
grant execute on function app.is_platform_operator() to authenticated;

create policy trager_operator_select on public.trager
  for select to authenticated using (app.is_platform_operator());
create policy einrichtungen_operator_select on public.einrichtungen
  for select to authenticated using (app.is_platform_operator());

-- 2. Betreiberdaten (Singleton) ---------------------------------------------

create table public.betreiber_einstellungen (
  id boolean primary key default true check (id),
  firmenname text not null default '',
  anschrift text not null default '',
  ust_id text,
  steuernummer text,
  iban text,
  bic text,
  bankname text,
  zahlungsziel_tage integer not null default 14 check (zahlungsziel_tage >= 0),
  ust_satz numeric not null default 19 check (ust_satz >= 0 and ust_satz <= 100),
  ust_hinweis text,
  rechnungsnummer_praefix text not null default '',
  fusszeile text,
  updated_at timestamptz not null default now()
);
insert into public.betreiber_einstellungen (id) values (true);
alter table public.betreiber_einstellungen enable row level security;
create policy betreiber_einstellungen_operator on public.betreiber_einstellungen
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());

-- 3. Kundenstamm für die Abrechnung -----------------------------------------
-- Bewusst getrennt von trager: ein Träger-Admin darf Preise nicht selbst ändern.

create table public.trager_abrechnung (
  trager_id uuid primary key references public.trager (id) on delete cascade,
  rechnungsname text,
  rechnungsanschrift text,
  rechnungs_email text,
  ust_id text,
  preis_grundgebuehr_pro_einrichtung numeric
    check (preis_grundgebuehr_pro_einrichtung is null or preis_grundgebuehr_pro_einrichtung >= 0),
  preis_pro_kind numeric check (preis_pro_kind is null or preis_pro_kind >= 0),
  updated_at timestamptz not null default now()
);
alter table public.trager_abrechnung enable row level security;
create policy trager_abrechnung_operator on public.trager_abrechnung
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());
create policy trager_abrechnung_traeger_admin_select on public.trager_abrechnung
  for select to authenticated
  using (trager_id = app.current_user_trager_id() and app.current_user_role() = 'traeger_admin');

-- 4. Rechnungen ----------------------------------------------------------------

create table public.rechnungsnummern (
  jahr integer primary key,
  letzte integer not null default 0
);
alter table public.rechnungsnummern enable row level security; -- keine Policies: nur über rechnung_freigeben()

create table public.rechnungen (
  id uuid primary key default gen_random_uuid(),
  trager_id uuid not null references public.trager (id) on delete restrict,
  nummer text unique,
  status text not null default 'entwurf'
    check (status in ('entwurf', 'versendet', 'bezahlt', 'storniert')),
  leistungszeitraum_von date not null,
  leistungszeitraum_bis date not null,
  rechnungsdatum date,
  faellig_am date,
  summe_netto numeric not null default 0,
  ust_satz numeric not null default 19,
  summe_ust numeric not null default 0,
  summe_brutto numeric not null default 0,
  absender jsonb,
  empfaenger jsonb,
  storno_von uuid references public.rechnungen (id) on delete restrict,
  versendet_am timestamptz,
  bezahlt_am date,
  notiz text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  check (leistungszeitraum_bis >= leistungszeitraum_von)
);
create index rechnungen_trager_id_idx on public.rechnungen (trager_id);
create index rechnungen_storno_von_idx on public.rechnungen (storno_von);
create index rechnungen_created_by_idx on public.rechnungen (created_by);

create table public.rechnungspositionen (
  id uuid primary key default gen_random_uuid(),
  rechnung_id uuid not null references public.rechnungen (id) on delete cascade,
  pos integer not null,
  beschreibung text not null,
  einrichtung_id uuid references public.einrichtungen (id) on delete set null,
  einrichtung_name text,
  menge numeric not null default 1,
  einheit text not null default 'Monat',
  einzelpreis_netto numeric not null default 0,
  summe_netto numeric generated always as (round(menge * einzelpreis_netto, 2)) stored,
  kinderzahl_snapshot integer
);
create index rechnungspositionen_rechnung_id_idx on public.rechnungspositionen (rechnung_id);
create index rechnungspositionen_einrichtung_id_idx on public.rechnungspositionen (einrichtung_id);

alter table public.rechnungen enable row level security;
alter table public.rechnungspositionen enable row level security;

create policy rechnungen_operator on public.rechnungen
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());
create policy rechnungen_traeger_admin_select on public.rechnungen
  for select to authenticated
  using (
    trager_id = app.current_user_trager_id()
    and app.current_user_role() = 'traeger_admin'
    and status <> 'entwurf'
  );

create policy rechnungspositionen_operator on public.rechnungspositionen
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());
create policy rechnungspositionen_traeger_admin_select on public.rechnungspositionen
  for select to authenticated
  using (
    exists (
      select 1 from public.rechnungen r
      where r.id = rechnung_id
        and r.trager_id = app.current_user_trager_id()
        and app.current_user_role() = 'traeger_admin'
        and r.status <> 'entwurf'
    )
  );

-- 5. Unveränderlichkeit freigegebener Rechnungen -----------------------------

create or replace function public.rechnungen_schutz()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Freigegebene Rechnungen können nicht gelöscht werden.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and new.status <> 'entwurf' then
    raise exception 'Neue Rechnungen müssen als Entwurf angelegt werden.';
  end if;

  if tg_op = 'UPDATE' and old.status <> 'entwurf' then
    if (to_jsonb(new) - array['status', 'bezahlt_am', 'notiz'])
       is distinct from (to_jsonb(old) - array['status', 'bezahlt_am', 'notiz']) then
      raise exception 'Freigegebene Rechnungen sind unveränderlich (nur Status, Zahlungsdatum und Notiz).';
    end if;
    if not (
      (old.status = 'versendet' and new.status in ('versendet', 'bezahlt', 'storniert'))
      or (old.status = 'bezahlt' and new.status in ('bezahlt', 'storniert'))
      or (old.status = 'storniert' and new.status = 'storniert')
    ) then
      raise exception 'Ungültiger Statuswechsel von % nach %.', old.status, new.status;
    end if;
    return new;
  end if;

  -- Entwurf (auch beim Übergang zur Freigabe): USt/Brutto aus Netto und Satz ableiten.
  new.summe_ust := round(new.summe_netto * new.ust_satz / 100, 2);
  new.summe_brutto := new.summe_netto + new.summe_ust;
  return new;
end;
$$;
create trigger rechnungen_schutz_trigger
  before insert or update or delete on public.rechnungen
  for each row execute function public.rechnungen_schutz();

create or replace function public.rechnungspositionen_schutz()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.rechnungen
  where id = coalesce(new.rechnung_id, old.rechnung_id);
  -- v_status ist null, wenn die Rechnung gerade (als Entwurf) samt Positionen gelöscht wird.
  if v_status is not null and v_status <> 'entwurf' then
    raise exception 'Positionen freigegebener Rechnungen sind unveränderlich.';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger rechnungspositionen_schutz_trigger
  before insert or update or delete on public.rechnungspositionen
  for each row execute function public.rechnungspositionen_schutz();

create or replace function public.rechnungspositionen_summen()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_id uuid := coalesce(new.rechnung_id, old.rechnung_id);
begin
  update public.rechnungen
  set summe_netto = (
    select coalesce(sum(summe_netto), 0) from public.rechnungspositionen where rechnung_id = v_id
  )
  where id = v_id and status = 'entwurf';
  return null;
end;
$$;
create trigger rechnungspositionen_summen_trigger
  after insert or update or delete on public.rechnungspositionen
  for each row execute function public.rechnungspositionen_summen();

-- Trigger-Funktionen dürfen nicht per RPC aufrufbar sein (Lehre aus log_team_change()).
revoke execute on function public.rechnungen_schutz() from public, anon, authenticated;
revoke execute on function public.rechnungspositionen_schutz() from public, anon, authenticated;
revoke execute on function public.rechnungspositionen_summen() from public, anon, authenticated;

-- 6. RPCs (alle prüfen selbst, dass der Aufrufer Betreiber ist) ---------------

create or replace function public.rechnung_positionen_setzen(p_id uuid, p_positionen jsonb)
returns void
language plpgsql
set search_path = public, app, pg_catalog
as $$
begin
  if not app.is_platform_operator() then
    raise exception 'Nur für den Betreiber.';
  end if;
  delete from public.rechnungspositionen where rechnung_id = p_id;
  insert into public.rechnungspositionen
    (rechnung_id, pos, beschreibung, einrichtung_id, einrichtung_name, menge, einheit,
     einzelpreis_netto, kinderzahl_snapshot)
  select p_id, x.ordinality::int, x.beschreibung, x.einrichtung_id, x.einrichtung_name,
         coalesce(x.menge, 1), coalesce(nullif(x.einheit, ''), 'Monat'),
         coalesce(x.einzelpreis_netto, 0), x.kinderzahl_snapshot
  from jsonb_to_recordset(p_positionen) with ordinality
    as x(beschreibung text, einrichtung_id uuid, einrichtung_name text, menge numeric,
         einheit text, einzelpreis_netto numeric, kinderzahl_snapshot integer);
end;
$$;

create or replace function public.rechnung_freigeben(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, app, pg_catalog
as $$
declare
  r public.rechnungen%rowtype;
  e public.betreiber_einstellungen%rowtype;
  t public.trager_abrechnung%rowtype;
  v_trager_name text;
  v_jahr integer;
  v_lfd integer;
  v_nummer text;
begin
  if not app.is_platform_operator() then
    raise exception 'Nur für den Betreiber.';
  end if;

  select * into r from public.rechnungen where id = p_id for update;
  if not found then
    raise exception 'Rechnung nicht gefunden.';
  end if;
  if r.status <> 'entwurf' then
    raise exception 'Nur Entwürfe können freigegeben werden.';
  end if;
  if not exists (select 1 from public.rechnungspositionen where rechnung_id = p_id) then
    raise exception 'Die Rechnung hat keine Positionen.';
  end if;

  select * into e from public.betreiber_einstellungen where id;
  if e.firmenname = '' or e.anschrift = '' then
    raise exception 'Bitte zuerst die Betreiberdaten (Firmenname, Anschrift) hinterlegen.';
  end if;

  select * into t from public.trager_abrechnung where trager_id = r.trager_id;
  select name into v_trager_name from public.trager where id = r.trager_id;

  v_jahr := extract(year from current_date)::integer;
  insert into public.rechnungsnummern as n (jahr, letzte) values (v_jahr, 1)
  on conflict (jahr) do update set letzte = n.letzte + 1
  returning n.letzte into v_lfd;
  v_nummer := e.rechnungsnummer_praefix || v_jahr || '-' || lpad(v_lfd::text, 4, '0');

  update public.rechnungen
  set nummer = v_nummer,
      status = 'versendet',
      rechnungsdatum = current_date,
      faellig_am = current_date + e.zahlungsziel_tage,
      versendet_am = now(),
      absender = jsonb_build_object(
        'firmenname', e.firmenname, 'anschrift', e.anschrift, 'ust_id', e.ust_id,
        'steuernummer', e.steuernummer, 'iban', e.iban, 'bic', e.bic, 'bankname', e.bankname,
        'ust_hinweis', e.ust_hinweis, 'fusszeile', e.fusszeile,
        'zahlungsziel_tage', e.zahlungsziel_tage),
      empfaenger = jsonb_build_object(
        'name', coalesce(nullif(t.rechnungsname, ''), v_trager_name),
        'anschrift', t.rechnungsanschrift, 'ust_id', t.ust_id, 'email', t.rechnungs_email)
  where id = p_id;

  return v_nummer;
end;
$$;

create or replace function public.rechnung_stornieren(p_id uuid)
returns uuid
language plpgsql
set search_path = public, app, pg_catalog
as $$
declare
  r public.rechnungen%rowtype;
  v_neu uuid;
begin
  if not app.is_platform_operator() then
    raise exception 'Nur für den Betreiber.';
  end if;

  select * into r from public.rechnungen where id = p_id for update;
  if not found then
    raise exception 'Rechnung nicht gefunden.';
  end if;
  if r.storno_von is not null then
    raise exception 'Gutschriften können nicht storniert werden.';
  end if;
  if r.status not in ('versendet', 'bezahlt') then
    raise exception 'Nur versendete oder bezahlte Rechnungen können storniert werden.';
  end if;

  update public.rechnungen set status = 'storniert' where id = p_id;

  insert into public.rechnungen
    (trager_id, status, leistungszeitraum_von, leistungszeitraum_bis, ust_satz, storno_von, notiz, created_by)
  values
    (r.trager_id, 'entwurf', r.leistungszeitraum_von, r.leistungszeitraum_bis, r.ust_satz, p_id,
     'Gutschrift zu Rechnung ' || coalesce(r.nummer, ''), auth.uid())
  returning id into v_neu;

  insert into public.rechnungspositionen
    (rechnung_id, pos, beschreibung, einrichtung_id, einrichtung_name, menge, einheit,
     einzelpreis_netto, kinderzahl_snapshot)
  select v_neu, pos, 'Storno: ' || beschreibung, einrichtung_id, einrichtung_name, menge, einheit,
         -einzelpreis_netto, kinderzahl_snapshot
  from public.rechnungspositionen where rechnung_id = p_id;

  return v_neu;
end;
$$;

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
language plpgsql
stable
security definer
set search_path = public, app, pg_catalog
as $$
begin
  if not app.is_platform_operator() then
    raise exception 'Nur für den Betreiber.';
  end if;
  return query
  select t.id, t.name, e.id, e.name, e.bundesland_code,
    (select count(*)::integer from public.kinder k
      where k.einrichtung_id = e.id and k.archived_at is null and k.status <> 'nachruecker'
        and k.eintritt is not null and k.eintritt <= p_stichtag
        and (k.austritt is null or k.austritt > p_stichtag)),
    (select count(*)::integer from public.gruppen g
      where g.einrichtung_id = e.id and g.archived_at is null)
  from public.trager t
  left join public.einrichtungen e on e.trager_id = t.id and e.archived_at is null
  order by t.name, e.name;
end;
$$;

revoke execute on function public.rechnung_positionen_setzen(uuid, jsonb) from public, anon;
revoke execute on function public.rechnung_freigeben(uuid) from public, anon;
revoke execute on function public.rechnung_stornieren(uuid) from public, anon;
revoke execute on function public.operator_kennzahlen(date) from public, anon;
grant execute on function public.rechnung_positionen_setzen(uuid, jsonb) to authenticated;
grant execute on function public.rechnung_freigeben(uuid) to authenticated;
grant execute on function public.rechnung_stornieren(uuid) to authenticated;
grant execute on function public.operator_kennzahlen(date) to authenticated;
