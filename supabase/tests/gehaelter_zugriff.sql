-- RLS-Regressionstest: Einzelgehälter (team_verguetung) hängen am Recht 'gehaelter', nicht an 'finanzen'.
--
-- Ausführen (SQL-Editor oder execute_sql). Legt Testnutzer nur innerhalb der Transaktion an und bricht am Ende
-- absichtlich mit "ERGEBNIS" ab, damit nichts bleibt.
-- Erwartung:
--   TRAEGER-ADMIN        sieht alle Einzelgehälter (>0), darf schreiben
--   LEITUNG-STANDARD     0 (Einrichtungsleitung hat Finanzen/Gehälter erst nach ausdrücklicher Freigabe)
--   MITARBEITER-FINANZEN 0 (nur Finanzübersicht, keine Einzelgehälter) — und kann nicht schreiben
--   MITARBEITER-GEHAELTER >0
do $$
declare
  res text := '';
  einr uuid; trager uuid;
  admin_id uuid; leitung uuid := gen_random_uuid(); fin uuid := gen_random_uuid(); geh uuid := gen_random_uuid();
  nutzer record; n int; kann_schreiben boolean; n_zeilen int;
begin
  select e.id, e.trager_id into einr, trager
  from einrichtungen e join team_verguetung v on v.einrichtung_id = e.id
  group by e.id, e.trager_id order by count(*) desc limit 1;
  select u.id into admin_id from user_profiles u where u.trager_id = trager and u.role = 'traeger_admin' limit 1;

  insert into auth.users (id, aud, role, email) values
    (leitung, 'authenticated', 'authenticated', 'leitung@rls-test.invalid'),
    (fin, 'authenticated', 'authenticated', 'fin@rls-test.invalid'),
    (geh, 'authenticated', 'authenticated', 'geh@rls-test.invalid');
  insert into user_profiles (id, trager_id, role, email) values
    (leitung, trager, 'einrichtungsleitung', 'leitung@rls-test.invalid'),
    (fin, trager, 'mitarbeiter', 'fin@rls-test.invalid'),
    (geh, trager, 'mitarbeiter', 'geh@rls-test.invalid');
  insert into einrichtung_berechtigungen (user_id, einrichtung_id, bereich, zugriff) values
    (fin, einr, 'finanzen', 'ansehen'),
    (fin, einr, 'personal', 'bearbeiten'),
    (geh, einr, 'gehaelter', 'ansehen');

  for nutzer in
    select 'TRAEGER-ADMIN' as art, admin_id as id
    union all select 'LEITUNG-STANDARD', leitung
    union all select 'MITARBEITER-FINANZEN', fin
    union all select 'MITARBEITER-GEHAELTER', geh
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', nutzer.id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from team_verguetung where einrichtung_id = einr;
    begin
      update team_verguetung set stufe = stufe where einrichtung_id = einr;
      get diagnostics n_zeilen = row_count;
      kann_schreiben := n_zeilen > 0;
    exception when others then kann_schreiben := false;
    end;
    res := res || nutzer.art || ': sichtbar=' || n || ' schreiben=' || kann_schreiben || E'\n';
    reset role;
  end loop;

  raise exception 'ERGEBNIS%', E'\n' || res;
end $$;
