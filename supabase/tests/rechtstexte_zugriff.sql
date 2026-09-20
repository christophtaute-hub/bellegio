-- RLS-Test: öffentliche Betreiberangaben und Zustimmungen zu AGB/AVV (Milestone 23).
-- Endet absichtlich mit einer Fehlermeldung ("ERGEBNIS"), damit nichts bleibt. Erwartung: jede Zeile beginnt mit OK.
do $$
declare
  res text := '';
  op_id uuid; katrin_id uuid; katrin_trager uuid;
  fremd_id uuid := gen_random_uuid(); fremd_trager uuid := gen_random_uuid();
  n int; ok boolean;
begin
  select po.user_id into op_id from platform_operators po limit 1;
  select id, trager_id into katrin_id, katrin_trager from user_profiles where email = 'katrin@bellegio.test';
  insert into auth.users (id, aud, role, email) values (fremd_id, 'authenticated', 'authenticated', 'fremd@rls-test.invalid');
  insert into trager (id, name) values (fremd_trager, 'RLS-Test Fremdträger');
  insert into user_profiles (id, trager_id, role, email) values (fremd_id, fremd_trager, 'traeger_admin', 'fremd@rls-test.invalid');

  -- Öffentlich lesbar (auch ohne Anmeldung)
  set local role anon;
  select count(*) into n from betreiber_oeffentlich;
  reset role;
  res := res || format(E'%s anonym kann die Betreiberangaben lesen\n', case when n = 1 then 'OK' else 'FEHLER' end);

  -- Ändern: nur Betreiber
  perform set_config('request.jwt.claims', json_build_object('sub', katrin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update betreiber_oeffentlich set firmenname = 'Manipuliert' where id = true;
  get diagnostics n = row_count;
  reset role;
  res := res || format(E'%s Mitarbeiter kann die Betreiberangaben nicht ändern\n', case when n = 0 then 'OK' else 'FEHLER' end);

  perform set_config('request.jwt.claims', json_build_object('sub', op_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update betreiber_oeffentlich set telefon = telefon where id = true;
  get diagnostics n = row_count;
  reset role;
  res := res || format(E'%s Betreiber kann die Angaben ändern\n', case when n = 1 then 'OK' else 'FEHLER' end);

  set local role authenticated;
  begin delete from betreiber_oeffentlich where id = true; get diagnostics n = row_count; exception when others then n := 0; end;
  reset role;
  res := res || format(E'%s auch der Betreiber kann die Zeile nicht löschen\n', case when n = 0 then 'OK' else 'FEHLER' end);

  -- Zustimmung: nur eigene, nur als Träger-Admin, nur für den eigenen Träger
  perform set_config('request.jwt.claims', json_build_object('sub', fremd_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into vertragszustimmungen (user_id, trager_id, dokument, version) values (fremd_id, fremd_trager, 'agb', 't1'); ok := true; exception when others then ok := false; end;
  res := res || format(E'%s Träger-Admin kann für den eigenen Träger zustimmen\n', case when ok then 'OK' else 'FEHLER' end);
  begin insert into vertragszustimmungen (user_id, trager_id, dokument, version) values (fremd_id, katrin_trager, 'avv', 't1'); ok := true; exception when others then ok := false; end;
  res := res || format(E'%s Zustimmung für einen fremden Träger wird abgelehnt\n', case when not ok then 'OK' else 'FEHLER' end);
  begin insert into vertragszustimmungen (user_id, trager_id, dokument, version) values (katrin_id, fremd_trager, 'avv', 't2'); ok := true; exception when others then ok := false; end;
  res := res || format(E'%s Zustimmung im Namen einer anderen Person wird abgelehnt\n', case when not ok then 'OK' else 'FEHLER' end);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', katrin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into vertragszustimmungen (user_id, trager_id, dokument, version) values (katrin_id, katrin_trager, 'agb', 't3'); ok := true; exception when others then ok := false; end;
  select count(*) into n from vertragszustimmungen;
  reset role;
  res := res || format(E'%s Mitarbeiter kann nicht zustimmen\n', case when not ok then 'OK' else 'FEHLER' end);
  res := res || format(E'%s Mitarbeiter sieht keine fremden Zustimmungen (%s)\n', case when n = 0 then 'OK' else 'FEHLER' end, n);

  raise exception E'ERGEBNIS\n%', res;
end $$;
