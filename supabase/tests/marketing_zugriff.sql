-- Marketing-Ampel M1: Zugriff. Läuft in einem DO-Block und bricht am Ende bewusst mit dem Ergebnis ab (nichts wird gespeichert).
-- Erwartung: einrichtungen via RPC: >0; einrichtungen direkt: 0; kinder: 0; team: 0; darf ansehen: true; darf bearbeiten: false;
-- selbst hochstufen: blockiert. Der Test-Nutzer (Mitarbeiter) verliert dafür in der Transaktion seine Bereichsrechte.
do $$
declare u uuid := '4e7dc59a-f32f-4efc-b2a0-2d51ea2e6ff6'; admin uuid := '37b39f0c-eee6-45a1-8df0-509c44393a1e'; t uuid; eid uuid; r text := ''; n int;
begin
  select trager_id into t from user_profiles where id = u;
  select id into eid from einrichtungen where trager_id = t and archived_at is null limit 1;
  delete from einrichtung_berechtigungen where user_id = u;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into marketing_zugang(user_id, trager_id, zugriff) values (u, t, 'ansehen');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from marketing_einrichtungen(); r := r || 'einrichtungen via RPC: ' || n || '; ';
  select count(*) into n from einrichtungen; r := r || 'einrichtungen direkt: ' || n || '; ';
  select count(*) into n from kinder; r := r || 'kinder: ' || n || '; ';
  select count(*) into n from team; r := r || 'team: ' || n || '; ';
  r := r || 'darf ansehen: ' || app.marketing_darf(eid, 'ansehen') || '; darf bearbeiten: ' || app.marketing_darf(eid, 'bearbeiten') || '; ';
  begin insert into marketing_zugang(user_id, trager_id, zugriff) values (u, t, 'bearbeiten') on conflict (user_id) do update set zugriff = 'bearbeiten'; r := r || 'selbst hochstufen: ERLAUBT (FEHLER); ';
  exception when others then r := r || 'selbst hochstufen: blockiert; '; end;
  reset role;
  raise exception 'ERGEBNIS: %', r;
end $$;
