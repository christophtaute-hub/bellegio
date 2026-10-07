-- Milestone 33, Phase 4c: Der Basisfaktor "unter drei Jahren (2,0)" bzw. "ab drei Jahren bis Schuleintritt (1,0)" wird für Bayern aus
-- Geburtsdatum, Gruppe und Kitajahr abgeleitet statt von Hand gepflegt (Art. 21 Abs. 5 BayKiBiG):
--   * 2,0 für Kinder unter drei Jahren,
--   * "Vollendet ein Kind in einer Kinderkrippe das dritte Lebensjahr, gilt der Gewichtungsfaktor 2,0 bis zum Ende des Kindergartenjahres",
--   * 1,0 ab drei Jahren bis zum Schuleintritt; liegen mehrere Faktoren vor, gilt der höchste.
-- Von Hand bleiben die Sondermerkmale (Schulkinder 1,2, Hort 1,3, Eltern beide nichtdeutschsprachiger Herkunft 1,3, Integrationskinder 4,5):
-- sie stehen weiter in kind_weighting_factors. Die Basiszeilen (u3, ue3_bis_schuleintritt) in kind_weighting_factors werden ignoriert.
-- "In einer Kinderkrippe" = die Gruppe des Kindes an seinem dritten Geburtstag ist eine Krippengruppe (Gruppenhistorie, sonst aktuelle Gruppe).
-- Andere Bundesländer: unverändert (nur die manuell gesetzten Faktoren).
create or replace function public.kind_gewichtung_am_stichtag(p_kind_id uuid, p_stichtag date, p_ohne_integration boolean default false)
returns table(weighting_factor_id uuid, code text, label text, factor numeric)
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  with kd as (
    select
      k.id,
      e.bundesland_code,
      e.kita_year_start_month as kj_monat,
      (k.geburtsdatum + interval '3 years')::date as dritter_geburtstag,
      coalesce(
        (select g.gruppenart
         from public.kind_gruppen_historie h
         join public.gruppen g on g.id = h.gruppe_id
         where h.kind_id = k.id and h.gueltig_ab <= (k.geburtsdatum + interval '3 years')::date
         order by h.gueltig_ab desc
         limit 1),
        (select g2.gruppenart from public.gruppen g2 where g2.id = k.gruppe_id)
      ) as gruppenart_bei_drei
    from public.kinder k
    join public.einrichtungen e on e.id = k.einrichtung_id
    where k.id = p_kind_id
  ),
  kj_ende as (
    -- letzter Tag des Kindergartenjahres, in dem das Kind drei wurde
    select
      kd.id,
      (make_date(
         (extract(year from kd.dritter_geburtstag)::int
           - case when extract(month from kd.dritter_geburtstag)::int >= kd.kj_monat then 0 else 1 end) + 1,
         kd.kj_monat, 1) - 1) as ende
    from kd
  ),
  basis as (
    select wf.id, wf.code, wf.label, wf.factor
    from kd
    join kj_ende on kj_ende.id = kd.id
    join public.weighting_factors wf
      on wf.bundesland_code = 'by'
     and wf.code = case
       when p_stichtag < kd.dritter_geburtstag then 'u3'
       when kd.gruppenart_bei_drei = 'krippe' and p_stichtag <= kj_ende.ende then 'u3'
       else 'ue3_bis_schuleintritt'
     end
    where kd.bundesland_code = 'by'
  ),
  manuell as (
    select wf.id, wf.code, wf.label, wf.factor
    from kd
    join public.kind_weighting_factors kwf on kwf.kind_id = kd.id
    join public.weighting_factors wf on wf.id = kwf.weighting_factor_id
    where (kd.bundesland_code <> 'by' or wf.code not in ('u3', 'ue3_bis_schuleintritt'))
      and (not p_ohne_integration or wf.code <> 'integrationskinder')
  )
  select x.id, x.code, x.label, x.factor
  from (select * from basis union all select * from manuell) x
  order by x.factor desc
  limit 1
$$;

revoke execute on function public.kind_gewichtung_am_stichtag(uuid, date, boolean) from public;
grant execute on function public.kind_gewichtung_am_stichtag(uuid, date, boolean) to authenticated;

-- kinder_presence_at_date nutzt jetzt den stichtagsgenauen Faktor (Rückgabestruktur unverändert).
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
  left join lateral public.kind_gewichtung_am_stichtag(k.id, p_stichtag, false) wf on true
  left join lateral public.kind_gewichtung_am_stichtag(k.id, p_stichtag, true) wf_fq on true
  where k.einrichtung_id = p_einrichtung_id
    and k.archived_at is null
    and k.status <> 'nachruecker'
    and k.eintritt is not null
    and k.eintritt <= p_stichtag
    and (k.austritt is null or k.austritt > p_stichtag)
$$;
