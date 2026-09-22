-- Buchungszeit-Historie je Kind: welches Buchungszeit-Band galt ab welchem Datum. Bewusst nur ein Datum je Zeile
-- (kein "gültig bis") — der gültige Zeitraum ergibt sich immer aus dem nächsten späteren Eintrag desselben Kindes,
-- das schließt Überlappungen und Drift zwischen zwei Datumsfeldern strukturell aus. "Welches Band galt am Datum X"
-- = die Zeile mit dem größten gueltig_ab <= X (wie bei team_monthly_hours, nur auf den Tag statt den Monat genau).
create table public.kind_buchungszeit_historie (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references public.kinder(id) on delete cascade,
  buchungszeit_band_id uuid references public.booking_time_bands(id),
  gueltig_ab date not null,
  created_at timestamptz not null default now(),
  unique (kind_id, gueltig_ab)
);
create index kind_buchungszeit_historie_kind_idx on public.kind_buchungszeit_historie (kind_id, gueltig_ab desc);

alter table public.kind_buchungszeit_historie enable row level security;

create policy kind_buchungszeit_historie_select on public.kind_buchungszeit_historie
  for select to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_buchungszeit_historie.kind_id
      and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

-- Kein update/delete über die App — Audit-Charakter wie das bestehende Änderungsprotokoll. Eine echte Korrektur
-- macht der Betreiber nötigenfalls per SQL.
create policy kind_buchungszeit_historie_insert on public.kind_buchungszeit_historie
  for insert to authenticated
  with check (exists (
    select 1 from public.kinder k
    where k.id = kind_buchungszeit_historie.kind_id
      and app.current_user_can_write_belegung(k.einrichtung_id)
  ));

-- Backfill: jedes bestehende Kind bekommt eine Zeile mit seinem aktuellen Band, "gültig ab" Eintritt (bzw. ein
-- weit zurückliegendes Datum, falls kein Eintritt gesetzt ist). Echte Vergangenheit vor dieser Migration lässt
-- sich nicht rekonstruieren — Stichtage davor zeigen bis zur ersten echten Änderung weiterhin den heutigen Wert.
insert into public.kind_buchungszeit_historie (kind_id, buchungszeit_band_id, gueltig_ab)
select id, buchungszeit_band_id, coalesce(eintritt, date '2000-01-01')
from public.kinder
where archived_at is null;

-- kinder_presence_at_date löst die Buchungszeit jetzt zum Stichtag statt über die feste Spalte auf. Gleiche
-- Rückgabestruktur — alle Aufrufer (Dashboard, Forecast/Controlling, Szenario-Rechner-Startwert) werden dadurch
-- automatisch stichtags-korrekt, ohne eigenen Code zu ändern.
create or replace function public.kinder_presence_at_date(p_einrichtung_id uuid, p_stichtag date)
returns table(kind_id uuid, gruppe_id uuid, buchungszeit_band_id uuid, buchungszeit_label text, buchungszeit_factor numeric, weighting_factor_id uuid, weighting_factor_code text, weighting_factor_label text, weighting_factor_value numeric, weighting_factor_value_fachkraftquote numeric)
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select
    k.id as kind_id,
    k.gruppe_id,
    hb.buchungszeit_band_id,
    btb.label as buchungszeit_label,
    btb.factor as buchungszeit_factor,
    wf.weighting_factor_id,
    wf.code as weighting_factor_code,
    wf.label as weighting_factor_label,
    coalesce(wf.factor, 1.0) as weighting_factor_value,
    coalesce(wf_fq.factor, 1.0) as weighting_factor_value_fachkraftquote
  from public.kinder k
  left join lateral (
    select h.buchungszeit_band_id
    from public.kind_buchungszeit_historie h
    where h.kind_id = k.id and h.gueltig_ab <= p_stichtag
    order by h.gueltig_ab desc
    limit 1
  ) hb on true
  left join public.booking_time_bands btb on btb.id = hb.buchungszeit_band_id
  left join lateral public.kind_max_weighting_factor(k.id) wf on true
  left join lateral public.kind_max_weighting_factor_ohne_integration(k.id) wf_fq on true
  where k.einrichtung_id = p_einrichtung_id
    and k.archived_at is null
    and k.status <> 'nachruecker'
    and k.eintritt is not null
    and k.eintritt <= p_stichtag
    and (k.austritt is null or k.austritt > p_stichtag)
$$;
