-- Milestone 33, Phase 2b: Gruppenhistorie je Kind (interne Wechsel, z. B. Krippe → Kindergarten zum Kitajahr).
-- Wie kind_buchungszeit_historie: nur ein Datum je Zeile, "welche Gruppe galt am Stichtag" = die Zeile mit dem größten
-- gueltig_ab <= Stichtag. Ein geplanter Wechsel ist eine Zeile mit Datum in der Zukunft; Belegung, Forecast und Gruppen-Ampel
-- rechnen damit ab dem Termin automatisch mit der neuen Gruppe (kinder_presence_at_date). kinder.gruppe_id bleibt der
-- bequeme "aktuelle" Wert und wird täglich nachgezogen (pg_cron) bzw. sofort, wenn der Wechsel heute oder früher gilt.
create table public.kind_gruppen_historie (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references public.kinder(id) on delete cascade,
  gruppe_id uuid references public.gruppen(id) on delete set null,
  gueltig_ab date not null,
  created_at timestamptz not null default now(),
  unique (kind_id, gueltig_ab)
);
create index kind_gruppen_historie_kind_idx on public.kind_gruppen_historie (kind_id, gueltig_ab desc);

alter table public.kind_gruppen_historie enable row level security;

create policy kind_gruppen_historie_select on public.kind_gruppen_historie
  for select to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_gruppen_historie.kind_id
      and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

create policy kind_gruppen_historie_insert on public.kind_gruppen_historie
  for insert to authenticated
  with check (exists (
    select 1 from public.kinder k
    where k.id = kind_gruppen_historie.kind_id
      and app.current_user_can_write_belegung(k.einrichtung_id)
  ));

-- Ein *geplanter* Wechsel (Termin in der Zukunft) lässt sich zurücknehmen; vergangene Zeilen bleiben (Audit-Charakter).
create policy kind_gruppen_historie_delete_geplant on public.kind_gruppen_historie
  for delete to authenticated
  using (
    gueltig_ab > current_date
    and exists (
      select 1 from public.kinder k
      where k.id = kind_gruppen_historie.kind_id
        and app.current_user_can_write_belegung(k.einrichtung_id)
    )
  );

-- Backfill: jedes Kind mit Gruppe bekommt eine Zeile "seit Eintritt in dieser Gruppe".
insert into public.kind_gruppen_historie (kind_id, gruppe_id, gueltig_ab)
select id, gruppe_id, coalesce(eintritt, date '2000-01-01')
from public.kinder
where archived_at is null and gruppe_id is not null;

-- kinder_presence_at_date löst die Gruppe zum Stichtag auf (Rückgabestruktur unverändert).
create or replace function public.kinder_presence_at_date(p_einrichtung_id uuid, p_stichtag date)
returns table(kind_id uuid, gruppe_id uuid, buchungszeit_band_id uuid, buchungszeit_label text, buchungszeit_factor numeric, weighting_factor_id uuid, weighting_factor_code text, weighting_factor_label text, weighting_factor_value numeric, weighting_factor_value_fachkraftquote numeric)
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select
    k.id as kind_id,
    coalesce(hg.gruppe_id, k.gruppe_id) as gruppe_id,
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
  left join lateral (
    select g.gruppe_id
    from public.kind_gruppen_historie g
    where g.kind_id = k.id and g.gueltig_ab <= p_stichtag
    order by g.gueltig_ab desc
    limit 1
  ) hg on true
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

-- Zieht kinder.gruppe_id auf die heute gültige Gruppe nach (fällige Wechsel). Nur für den Cron-Job und Wartung gedacht.
create or replace function public.wende_gruppenwechsel_an()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  anzahl integer;
begin
  with aktuell as (
    select distinct on (h.kind_id) h.kind_id, h.gruppe_id
    from public.kind_gruppen_historie h
    where h.gueltig_ab <= current_date
    order by h.kind_id, h.gueltig_ab desc
  )
  update public.kinder k
  set gruppe_id = a.gruppe_id
  from aktuell a
  where a.kind_id = k.id
    and a.gruppe_id is not null
    and k.gruppe_id is distinct from a.gruppe_id;
  get diagnostics anzahl = row_count;
  return anzahl;
end;
$$;
revoke execute on function public.wende_gruppenwechsel_an() from public, anon, authenticated;

-- Täglich kurz nach Mitternacht (UTC). pg_cron ist bei Supabase verfügbar; ohne die Erweiterung bleibt der Wechsel
-- trotzdem wirksam (Forecast/Belegung lesen die Historie), nur kinder.gruppe_id zieht erst bei der nächsten Bearbeitung nach.
create extension if not exists pg_cron;
select cron.schedule('gruppenwechsel-anwenden', '5 0 * * *', $$select public.wende_gruppenwechsel_an()$$);
