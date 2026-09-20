-- RLS-Regressionstest: Umsatz-, Rechnungs- und Betreiberdaten sind nur für den Betreiber sichtbar.
--
-- Ausführen (SQL-Editor oder execute_sql). Der Test legt einen fremden Träger-Administrator nur innerhalb der
-- Transaktion an und bricht am Ende absichtlich mit einer Fehlermeldung ab ("ERGEBNIS"), damit nichts bleibt.
-- Erwartung: Jede Zeile "NICHT-BETREIBER" zeigt überall 0 (der fremde Träger-Admin sieht höchstens die eigene
-- Preiszeile); "BETREIBER" zeigt die echten Zahlen; am Ende steht "operatoren=1".
do $$
declare
  res text := '';
  fremd_id uuid := gen_random_uuid();
  fremd_trager uuid := gen_random_uuid();
  nutzer record;
  n_rechnungen int; n_positionen int; n_einstellungen int; n_fremdpreise int; n_zeilen int; n_anfragen int;
  n_operatoren int; n_nummern int; n_kennzahlen int; update_moeglich boolean;
begin
  -- Fremder Kunde: Träger + Träger-Administrator (nur in dieser Transaktion)
  insert into auth.users (id, aud, role, email) values (fremd_id, 'authenticated', 'authenticated', 'fremd-admin@rls-test.invalid');
  insert into trager (id, name) values (fremd_trager, 'RLS-Test Fremdträger');
  insert into user_profiles (id, trager_id, role, email) values (fremd_id, fremd_trager, 'traeger_admin', 'fremd-admin@rls-test.invalid');
  insert into trager_abrechnung (trager_id, rechnungsname) values (fremd_trager, 'Fremd');

  for nutzer in
    select 'BETREIBER' as art, u.id, u.email from user_profiles u join platform_operators po on po.user_id = u.id
    union all
    select 'NICHT-BETREIBER', u.id, u.email from user_profiles u
      where u.id not in (select user_id from platform_operators)
        and (u.email in ('katrin@bellegio.test', 'olga@bellegio.test', 'enno@bellegio.test', 'sabine@bellegio.test')
             or u.id = fremd_id)
    order by 1, 3
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', nutzer.id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select count(*) into n_rechnungen from rechnungen;
    select count(*) into n_positionen from rechnungspositionen;
    select count(*) into n_einstellungen from betreiber_einstellungen;
    select count(*) into n_fremdpreise from trager_abrechnung where trager_id <> coalesce(app.current_user_trager_id(), gen_random_uuid());
    select count(*) into n_anfragen from demo_anfragen;
    select count(*) into n_nummern from rechnungsnummern;
    select count(*) into n_operatoren from platform_operators;
    begin
      select count(*) into n_kennzahlen from operator_kennzahlen(current_date);
    exception when others then n_kennzahlen := -1; -- -1 = Zugriff verweigert
    end;
    begin
      update listenpreise set preis_pro_kind = preis_pro_kind where id = true;
      get diagnostics n_zeilen = row_count; -- Zeilen, die die Regel zum Ändern freigibt
      update_moeglich := n_zeilen > 0;
    exception when others then update_moeglich := false;
    end;

    reset role;
    res := res || format(E'%s %s: rechnungen=%s positionen=%s einstellungen=%s fremde_kundenpreise=%s listenpreise_aendern=%s anfragen=%s nummern=%s operatoren_sichtbar=%s kennzahlen=%s\n',
      nutzer.art, nutzer.email, n_rechnungen, n_positionen, n_einstellungen, n_fremdpreise, update_moeglich, n_anfragen, n_nummern, n_operatoren, n_kennzahlen);
  end loop;

  select count(*) into n_operatoren from platform_operators;
  res := res || format('operatoren=%s', n_operatoren);
  raise exception E'ERGEBNIS\n%', res;
end $$;
