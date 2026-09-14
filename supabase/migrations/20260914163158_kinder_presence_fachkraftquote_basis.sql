-- § 17 Abs. 2 Satz 2 AVBayKiBiG: der Gewichtungsfaktor für behinderte Kinder
-- (Integrationskinder, 4,5) wird für die Fachkraftquote nicht eingerechnet.
-- kind_max_weighting_factor_ohne_integration liefert daher den sonst
-- zutreffenden (nächsthöchsten) Gewichtungsfaktor ohne den Integrationsfaktor.
create or replace function public.kind_max_weighting_factor_ohne_integration(p_kind_id uuid)
returns table (
  weighting_factor_id uuid,
  code text,
  label text,
  factor numeric
)
language sql
stable
set search_path = public, pg_catalog
as $$
  select wf.id, wf.code, wf.label, wf.factor
  from public.kind_weighting_factors kwf
  join public.weighting_factors wf on wf.id = kwf.weighting_factor_id
  where kwf.kind_id = p_kind_id
    and wf.code <> 'integrationskinder'
  order by wf.factor desc
  limit 1
$$;

drop function if exists public.kinder_presence_at_date(uuid, date);

create function public.kinder_presence_at_date(p_einrichtung_id uuid, p_stichtag date)
returns table (
  kind_id uuid,
  gruppe_id uuid,
  buchungszeit_band_id uuid,
  buchungszeit_label text,
  buchungszeit_factor numeric,
  weighting_factor_id uuid,
  weighting_factor_code text,
  weighting_factor_label text,
  weighting_factor_value numeric,
  weighting_factor_value_fachkraftquote numeric
)
language sql
stable
set search_path = public, pg_catalog
as $$
  select
    k.id as kind_id,
    k.gruppe_id,
    k.buchungszeit_band_id,
    btb.label as buchungszeit_label,
    btb.factor as buchungszeit_factor,
    wf.weighting_factor_id,
    wf.code as weighting_factor_code,
    wf.label as weighting_factor_label,
    coalesce(wf.factor, 1.0) as weighting_factor_value,
    coalesce(wf_fq.factor, 1.0) as weighting_factor_value_fachkraftquote
  from public.kinder k
  left join public.booking_time_bands btb on btb.id = k.buchungszeit_band_id
  left join lateral public.kind_max_weighting_factor(k.id) wf on true
  left join lateral public.kind_max_weighting_factor_ohne_integration(k.id) wf_fq on true
  where k.einrichtung_id = p_einrichtung_id
    and k.archived_at is null
    and k.status <> 'nachruecker'
    and k.eintritt is not null
    and k.eintritt <= p_stichtag
    and (k.austritt is null or k.austritt > p_stichtag)
$$;
