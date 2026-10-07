-- Regressionstest: abgeleiteter Basisfaktor (Bayern, Art. 21 Abs. 5 BayKiBiG). Legt Testkinder nur innerhalb der Transaktion an und
-- bricht am Ende absichtlich mit "ERGEBNIS" ab. Erwartung (Zeile je Fall):
--   krippe-Kind (3 am 15.10.2026): u3 am 31.08.2026 · u3 am 15.10.2026 · u3 am 31.08.2027 · ue3 am 01.09.2027
--   krippe-Kind (3 am 10.06.2026): u3 am 31.08.2026 · ue3 am 01.09.2026
--   kindergarten-Kind (3 am 15.10.2026): u3 am 14.10.2026 · ue3 am 15.10.2026
--   Sondermerkmal "Integrationskinder" (4,5) gewinnt immer, "Fachkraftquote" (ohne Integration) liefert den Basisfaktor
do $$
declare
  einr uuid; krippe uuid; kiga uuid; k1 uuid := gen_random_uuid(); k2 uuid := gen_random_uuid(); k3 uuid := gen_random_uuid();
  integ uuid; res text := '';
begin
  select e.id into einr from einrichtungen e where e.bundesland_code = 'by' and e.kita_year_start_month = 9 limit 1;
  select g.id into krippe from gruppen g where g.einrichtung_id = einr and g.gruppenart = 'krippe' limit 1;
  select g.id into kiga from gruppen g where g.einrichtung_id = einr and g.gruppenart = 'kindergarten' limit 1;
  select id into integ from weighting_factors where code = 'integrationskinder';

  insert into kinder (id, einrichtung_id, gruppe_id, vorname, nachname, geburtsdatum, status, eintritt, austritt, geschlecht)
  values
    (k1, einr, krippe, 'T1', 'Test', date '2023-10-15', 'aktiv', date '2024-01-01', date '2028-09-01', 'weiblich'),
    (k2, einr, krippe, 'T2', 'Test', date '2023-06-10', 'aktiv', date '2024-01-01', date '2028-09-01', 'weiblich'),
    (k3, einr, kiga,   'T3', 'Test', date '2023-10-15', 'aktiv', date '2024-01-01', date '2028-09-01', 'weiblich');
  delete from kind_gruppen_historie where kind_id in (k1, k2, k3);

  res := res || 'k1: ' || concat_ws(' · ',
    (select code from kind_gewichtung_am_stichtag(k1, date '2026-08-31')),
    (select code from kind_gewichtung_am_stichtag(k1, date '2026-10-15')),
    (select code from kind_gewichtung_am_stichtag(k1, date '2027-08-31')),
    (select code from kind_gewichtung_am_stichtag(k1, date '2027-09-01'))) || E'\n';
  res := res || 'k2: ' || concat_ws(' · ',
    (select code from kind_gewichtung_am_stichtag(k2, date '2026-08-31')),
    (select code from kind_gewichtung_am_stichtag(k2, date '2026-09-01'))) || E'\n';
  res := res || 'k3: ' || concat_ws(' · ',
    (select code from kind_gewichtung_am_stichtag(k3, date '2026-10-14')),
    (select code from kind_gewichtung_am_stichtag(k3, date '2026-10-15'))) || E'\n';

  insert into kind_weighting_factors (kind_id, weighting_factor_id) values (k1, integ);
  res := res || 'k1 mit Integration: ' || (select code from kind_gewichtung_am_stichtag(k1, date '2026-10-15', false))
              || ' · Fachkraftquote: ' || (select code from kind_gewichtung_am_stichtag(k1, date '2026-10-15', true)) || E'\n';

  raise exception 'ERGEBNIS%', E'\n' || res;
end $$;
