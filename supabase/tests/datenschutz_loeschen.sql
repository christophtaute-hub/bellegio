-- Test: Löschen und Anonymisieren von Kinder- und Personaldaten (Milestone 23).
-- Läuft in einer Transaktion und endet absichtlich mit einer Fehlermeldung ("ERGEBNIS"), damit nichts bleibt.
-- Erwartung: jede Zeile beginnt mit OK.
do $$
declare
  res text := '';
  admin_id uuid;
  admin_trager uuid;
  fremd_id uuid := gen_random_uuid();
  fremd_trager uuid := gen_random_uuid();
  katrin_id uuid;
  kind_a uuid; kind_b uuid; person uuid;
  n int; v text; ok boolean; ok2 boolean;

begin
  -- Christoph ist Träger-Admin seines Trägers und Betreiber; für den Test zählt nur die Rolle traeger_admin.
  select id, trager_id into admin_id, admin_trager from user_profiles where email = 'christoph.taute@web.de';
  select id into katrin_id from user_profiles where email = 'katrin@bellegio.test';
  insert into auth.users (id, aud, role, email) values (fremd_id, 'authenticated', 'authenticated', 'fremd@rls-test.invalid');
  insert into trager (id, name) values (fremd_trager, 'RLS-Test Fremdträger');
  insert into user_profiles (id, trager_id, role, email) values (fremd_id, fremd_trager, 'traeger_admin', 'fremd@rls-test.invalid');

  -- Zwei Kinder und eine Person aus dem Träger des Admins auswählen und "ausgetreten" machen.
  select k.id into kind_a from kinder k join einrichtungen e on e.id = k.einrichtung_id where e.trager_id = admin_trager and k.status = 'aktiv' order by k.id limit 1;
  select k.id into kind_b from kinder k join einrichtungen e on e.id = k.einrichtung_id where e.trager_id = admin_trager and k.status = 'aktiv' and k.id <> kind_a order by k.id limit 1;
  select t.id into person from team t join einrichtungen e on e.id = t.einrichtung_id where e.trager_id = admin_trager and t.status = 'aktiv' order by t.id limit 1;
  update kinder set notizen = 'Allergie X', wohnort = 'Musterstadt', platznummer = '7' where id in (kind_a, kind_b);
  update kinder set vorname = vorname || '' where id = kind_a; -- erzeugt einen Eintrag im Änderungsprotokoll

  -- 1. Aktives, nicht ausgetretenes Kind: gesperrt (auch für den Admin)
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.kind_datenschutz(kind_a, 'anonymisieren'); ok := true; exception when others then ok := false; v := sqlerrm; end;
  reset role;
  res := res || format(E'%s aktives Kind ist gesperrt (%s)\n', case when not ok then 'OK' else 'FEHLER' end, coalesce(v, ''));

  -- Ab jetzt sind beide Kinder ausgetreten.
  update kinder set austritt = current_date - 30, eintritt = least(coalesce(eintritt, current_date - 400), current_date - 400) where id in (kind_a, kind_b);
  update team set austritt = current_date - 30 where id = person;
  insert into team_ausfallzeiten (team_id, art, von, notizen) values (person, 'krankheit', current_date - 100, 'Diagnose Y');

  -- 2. Nicht-Admin (Mitarbeiter) darf nicht
  perform set_config('request.jwt.claims', json_build_object('sub', katrin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.kind_datenschutz(kind_a, 'loeschen'); ok := true; exception when others then ok := false; end;
  reset role;
  res := res || format(E'%s Mitarbeiter darf nicht löschen\n', case when not ok then 'OK' else 'FEHLER' end);

  -- 3. Träger-Admin eines fremden Kunden darf nicht
  perform set_config('request.jwt.claims', json_build_object('sub', fremd_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.kind_datenschutz(kind_a, 'anonymisieren'); ok := true; exception when others then ok := false; end;
  begin perform public.team_datenschutz(person, 'loeschen'); ok2 := true; exception when others then ok2 := false; end;
  reset role;
  ok := ok or ok2;
  res := res || format(E'%s fremder Träger-Admin darf nicht\n', case when not ok then 'OK' else 'FEHLER' end);

  -- 4. Träger-Admin anonymisiert ein Kind
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.kind_datenschutz(kind_a, 'anonymisieren');
  reset role;
  select count(*) into n from kinder where id = kind_a and vorname = 'Anonym' and nachname = 'Kind' and notizen is null and wohnort is null and platznummer is null
    and extract(month from geburtsdatum) = 7 and extract(day from geburtsdatum) = 1;
  res := res || format(E'%s Kind anonymisiert (Name, Notizen, Wohnort, Platz entfernt, Geburtsdatum auf Jahresmitte)\n', case when n = 1 then 'OK' else 'FEHLER' end);
  select count(*) into n from kinder_audit_log where kind_id = kind_a;
  res := res || format(E'%s Änderungsprotokoll des anonymisierten Kindes bereinigt (%s Zeilen übrig)\n', case when n = 0 then 'OK' else 'FEHLER' end, n);
  select count(*) into n from kinder where id = kind_a and status is not null and eintritt is not null;
  res := res || format(E'%s Statistikfelder bleiben erhalten\n', case when n = 1 then 'OK' else 'FEHLER' end);

  -- 5. Zweites Mal anonymisieren wird abgelehnt
  set local role authenticated;
  begin perform public.kind_datenschutz(kind_a, 'anonymisieren'); ok := true; exception when others then ok := false; end;
  reset role;
  res := res || format(E'%s doppeltes Anonymisieren wird abgelehnt\n', case when not ok then 'OK' else 'FEHLER' end);

  -- 6. Träger-Admin löscht ein Kind endgültig
  set local role authenticated;
  perform public.kind_datenschutz(kind_b, 'loeschen');
  reset role;
  select count(*) into n from kinder where id = kind_b;
  res := res || format(E'%s Kind endgültig gelöscht\n', case when n = 0 then 'OK' else 'FEHLER' end);
  select count(*) into n from kinder_audit_log where kind_id = kind_b;
  res := res || format(E'%s Änderungsprotokoll des gelöschten Kindes weg\n', case when n = 0 then 'OK' else 'FEHLER' end);

  -- 7. Personal anonymisieren: Ausfallgrund weg, Stunden bleiben
  set local role authenticated;
  perform public.team_datenschutz(person, 'anonymisieren');
  reset role;
  select count(*) into n from team where id = person and vorname = 'Anonym' and nachname = 'Mitarbeiter' and wochenstunden is not null;
  res := res || format(E'%s Person anonymisiert\n', case when n = 1 then 'OK' else 'FEHLER' end);
  select count(*) into n from team_ausfallzeiten where team_id = person and notizen is null and art = 'sonstiges';
  res := res || format(E'%s Ausfallzeiten verlieren den Grund (%s Zeilen)\n', case when n >= 1 then 'OK' else 'FEHLER' end, n);

  -- 8. Protokoll: drei Einträge, ohne Klarnamen, nur für den Träger-Admin lesbar
  set local role authenticated;
  select count(*) into n from loeschprotokoll;
  reset role;
  res := res || format(E'%s Löschprotokoll hat 3 Einträge für den Admin (%s)\n', case when n = 3 then 'OK' else 'FEHLER' end, n);
  perform set_config('request.jwt.claims', json_build_object('sub', katrin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from loeschprotokoll;
  reset role;
  res := res || format(E'%s Mitarbeiter sieht das Löschprotokoll nicht\n', case when n = 0 then 'OK' else 'FEHLER' end);

  raise exception E'ERGEBNIS\n%', res;
end $$;
