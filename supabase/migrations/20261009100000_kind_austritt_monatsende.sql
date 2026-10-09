-- Austrittsdaten von Kindern sind immer der letzte Tag eines Monats (Betreuungsverträge enden zum Monatsende).
-- 1) Bestand angleichen: ein Austritt am 1. eines Monats wird zum letzten Tag des Vormonats, jedes andere Datum zum Ende seines Monats.
-- 2) Regel in der Datenbank festhalten.
-- 3) Anwesenheit: ein Kind ist am Austrittstag selbst noch da (>= statt >). Für die Monatsersten, mit denen die Forecasts rechnen,
--    ändert sich dadurch nichts; nur ein Stichtag mitten im Monat sieht das Kind am letzten Tag noch.

update public.kinder
set austritt = case
  when extract(day from austritt) = 1 then (austritt - 1)
  else (date_trunc('month', austritt) + interval '1 month - 1 day')::date
end
where austritt is not null
  and austritt <> (date_trunc('month', austritt) + interval '1 month - 1 day')::date;

alter table public.kinder
  add constraint kinder_austritt_monatsende
  check (austritt is null or austritt = (date_trunc('month', austritt) + interval '1 month - 1 day')::date);

create or replace function public.kinder_presence_at_date(p_einrichtung_id uuid, p_stichtag date)
returns table(kind_id uuid, gruppe_id uuid, buchungszeit_band_id uuid, buchungszeit_label text, buchungszeit_factor numeric, weighting_factor_id uuid, weighting_factor_code text, weighting_factor_label text, weighting_factor_value numeric, weighting_factor_value_fachkraftquote numeric)
language sql
stable
set search_path to 'public', 'pg_catalog'
as $function$
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
  left join lateral public.kind_gewichtung_am_stichtag(k.id, p_stichtag, false) wf on true
  left join lateral public.kind_gewichtung_am_stichtag(k.id, p_stichtag, true) wf_fq on true
  where k.einrichtung_id = p_einrichtung_id
    and k.archived_at is null
    and k.status <> 'nachruecker'
    and k.eintritt is not null
    and k.eintritt <= p_stichtag
    and (k.austritt is null or k.austritt >= p_stichtag)
$function$;
