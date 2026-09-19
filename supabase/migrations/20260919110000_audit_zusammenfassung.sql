-- Zusammenfassung der Änderungsprotokolle je Monat für die Prüfungsmappe.
-- SECURITY INVOKER: die RLS der Audit-Tabellen entscheidet, was der Aufrufer sieht.
create or replace function public.audit_zusammenfassung(p_einrichtung_id uuid, p_von date, p_bis date)
returns table (monat date, bereich text, anzahl integer)
language sql
stable
set search_path = public, pg_catalog
as $$
  select date_trunc('month', a.changed_at)::date, 'kinder'::text, count(*)::integer
  from public.kinder_audit_log a
  join public.kinder k on k.id = a.kind_id
  where k.einrichtung_id = p_einrichtung_id
    and a.changed_at >= p_von and a.changed_at < (p_bis + 1)
  group by 1
  union all
  select date_trunc('month', a.changed_at)::date, 'personal'::text, count(*)::integer
  from public.team_audit_log a
  join public.team t on t.id = a.team_id
  where t.einrichtung_id = p_einrichtung_id
    and a.changed_at >= p_von and a.changed_at < (p_bis + 1)
  group by 1
  order by 1, 2;
$$;

revoke execute on function public.audit_zusammenfassung(uuid, date, date) from public, anon;
grant execute on function public.audit_zusammenfassung(uuid, date, date) to authenticated;
