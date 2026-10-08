-- Demo-Preisliste "Kinderzentren Kunterbunt, München, gültig ab 09/2026" für die Einrichtung "Testkita Bayern" (beide Träger-Kopien).
-- Beispielwerte aus der öffentlichen Preisliste; Kategorien in Std./Woche = Tagesband × 5 (die drei Bänder bis 4 h gehören zu "≤ 20 Std.").
-- Hinweis: standort_gemeinde braucht einen Träger-Admin-Kontext (Spalten-Guard); darum die Impersonation. Ausführen im SQL-Editor.
do $$
declare
  e record; admin_id uuid; b record; kat int; k numeric; ka numeric; g numeric; ga numeric;
begin
  for e in select id, trager_id from einrichtungen where name = 'Testkita Bayern' loop
    select id into admin_id from user_profiles where trager_id = e.trager_id and role = 'traeger_admin' limit 1;
    perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update einrichtungen set standort_gemeinde = 'München' where id = e.id;
    reset role;
    delete from einrichtung_beitraege where einrichtung_id = e.id;
    for b in select id, sort_order from booking_time_bands where bundesland_code = 'by' loop
      kat := greatest(b.sort_order, 3) - 2;
      k  := (array[95,121,146,172,198,224,250])[kat];
      ka := (array[259,323,389,453,511,549,582])[kat];
      g  := (array[38,48,58,69,79,90,100])[kat];
      ga := (array[105,135,163,192,221,250,278])[kat];
      insert into einrichtung_beitraege (einrichtung_id, booking_time_band_id, gruppenart, auswaertig, betrag_monat, gueltig_ab) values
        (e.id, b.id, 'krippe', false, k, '2026-09-01'),
        (e.id, b.id, 'krippe', true, ka, '2026-09-01'),
        (e.id, b.id, 'kindergarten', false, g, '2026-09-01'),
        (e.id, b.id, 'kindergarten', true, ga, '2026-09-01');
    end loop;
  end loop;
end $$;
