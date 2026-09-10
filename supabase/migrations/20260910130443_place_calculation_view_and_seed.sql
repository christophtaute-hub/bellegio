create or replace view public.children_place_calculation_view
with (security_invoker = true) as
select
  k.id as kind_id,
  k.einrichtung_id,
  k.gruppe_id,
  g.gruppenart,
  coalesce(pr.platzwert, 1) as platzwert
from public.kinder k
join public.gruppen g on g.id = k.gruppe_id
left join public.platzwert_rules pr
  on pr.gruppenart = g.gruppenart
  and pr.age_matches_expected = (
    case g.gruppenart
      when 'krippe' then k.geburtsdatum > (current_date - interval '3 years')
      when 'kindergarten' then k.geburtsdatum <= (current_date - interval '3 years')
      else null
    end
  )
where k.status = 'aktiv'
  and k.archived_at is null
  and g.archived_at is null;

grant select on public.children_place_calculation_view to authenticated;

insert into public.booking_time_bands (label, min_hours, max_hours, factor, sort_order) values
  ('1-2h', 1, 2, 0.5, 1),
  ('2-3h', 2, 3, 0.75, 2),
  ('3-4h', 3, 4, 1.0, 3),
  ('4-5h', 4, 5, 1.25, 4),
  ('5-6h', 5, 6, 1.5, 5),
  ('6-7h', 6, 7, 1.75, 6),
  ('7-8h', 7, 8, 2.0, 7),
  ('8-9h', 8, 9, 2.25, 8),
  ('über 9h', 9, null, 2.5, 9);

insert into public.weighting_factors (code, label, factor) values
  ('u3', 'Kinder unter drei Jahren', 2.0),
  ('ue3_bis_schuleintritt', 'Kinder von drei Jahren bis Schuleintritt', 1.0),
  ('schulkinder', 'Schulkinder', 1.2),
  ('integrationskinder', 'Integrationskinder', 4.5),
  ('nicht_deutschsprachig', 'Nicht deutschsprachige Herkunft', 1.3),
  ('tagespflege', 'Tagespflege', 1.3);

insert into public.platzwert_rules (gruppenart, age_matches_expected, platzwert) values
  ('krippe', true, 1),
  ('krippe', false, 2),
  ('kindergarten', true, 1),
  ('kindergarten', false, 2);
