create table public.bundeslaender (
  code text primary key,
  name text not null
);

insert into public.bundeslaender (code, name) values ('by', 'Bayern');

alter table public.einrichtungen
  add column bundesland_code text not null default 'by' references public.bundeslaender(code);
alter table public.weighting_factors
  add column bundesland_code text not null default 'by' references public.bundeslaender(code);
alter table public.booking_time_bands
  add column bundesland_code text not null default 'by' references public.bundeslaender(code);
alter table public.platzwert_rules
  add column bundesland_code text not null default 'by' references public.bundeslaender(code);

create table public.staffing_rules (
  bundesland_code text primary key references public.bundeslaender(code),
  mindestschluessel numeric not null,
  fachkraftquote_anteil numeric not null
);

insert into public.staffing_rules (bundesland_code, mindestschluessel, fachkraftquote_anteil)
values ('by', 11.0, 0.5);

alter table public.bundeslaender enable row level security;
alter table public.staffing_rules enable row level security;

create policy bundeslaender_select on public.bundeslaender
  for select to authenticated using (true);
create policy staffing_rules_select on public.staffing_rules
  for select to authenticated using (true);

-- children_place_calculation_view: platzwert_rules lookup now scoped by the
-- Einrichtung's Bundesland, so a second Bundesland's rules don't leak in.
create or replace view public.children_place_calculation_view as
select
  k.id as kind_id,
  k.einrichtung_id,
  k.gruppe_id,
  g.gruppenart,
  coalesce(pr.platzwert, 1::numeric) as platzwert
from public.kinder k
join public.gruppen g on g.id = k.gruppe_id
join public.einrichtungen e on e.id = k.einrichtung_id
left join public.platzwert_rules pr
  on pr.gruppenart = g.gruppenart
  and pr.bundesland_code = e.bundesland_code
  and pr.age_matches_expected = case g.gruppenart
    when 'krippe' then k.geburtsdatum > (current_date - interval '3 years')
    when 'kindergarten' then k.geburtsdatum <= (current_date - interval '3 years')
    else null
  end
where k.status = 'aktiv' and k.archived_at is null and g.archived_at is null;

alter view public.children_place_calculation_view set (security_invoker = true);
