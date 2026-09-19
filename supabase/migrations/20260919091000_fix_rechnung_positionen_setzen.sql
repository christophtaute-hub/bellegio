-- jsonb_to_recordset lässt sich nicht mit WITH ORDINALITY kombinieren (Spaltenliste) —
-- stattdessen jsonb_array_elements verwenden.
create or replace function public.rechnung_positionen_setzen(p_id uuid, p_positionen jsonb)
returns void
language plpgsql
set search_path = public, app, pg_catalog
as $$
begin
  if not app.is_platform_operator() then
    raise exception 'Nur für den Betreiber.';
  end if;
  delete from public.rechnungspositionen where rechnung_id = p_id;
  insert into public.rechnungspositionen
    (rechnung_id, pos, beschreibung, einrichtung_id, einrichtung_name, menge, einheit,
     einzelpreis_netto, kinderzahl_snapshot)
  select p_id,
         e.ord::int,
         e.el ->> 'beschreibung',
         nullif(e.el ->> 'einrichtung_id', '')::uuid,
         e.el ->> 'einrichtung_name',
         coalesce((e.el ->> 'menge')::numeric, 1),
         coalesce(nullif(e.el ->> 'einheit', ''), 'Monat'),
         coalesce((e.el ->> 'einzelpreis_netto')::numeric, 0),
         (e.el ->> 'kinderzahl_snapshot')::integer
  from jsonb_array_elements(p_positionen) with ordinality as e(el, ord);
end;
$$;
