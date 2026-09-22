-- Nutzerverwaltung durch die Träger-Administration und Demo-Zugang.

-- 1. Änderungsprotokolle dürfen einen gelöschten Nutzer nicht mehr blockieren: der Verweis wird beim Löschen
-- des Nutzers geleert (der Eintrag selbst bleibt, nur „wer" ist dann unbekannt).
alter table public.kinder_audit_log drop constraint kinder_audit_log_changed_by_fkey;
alter table public.kinder_audit_log
  add constraint kinder_audit_log_changed_by_fkey foreign key (changed_by) references public.user_profiles(id) on delete set null;

alter table public.team_audit_log drop constraint team_audit_log_changed_by_fkey;
alter table public.team_audit_log
  add constraint team_audit_log_changed_by_fkey foreign key (changed_by) references public.user_profiles(id) on delete set null;

-- 2. Demo-Konten: Die App blendet dort Abrechnung sowie Passwort- und Zwei-Faktor-Änderung aus und zeigt einen Hinweis.
alter table public.user_profiles add column ist_demo boolean not null default false;

-- Das Flag darf, wie Rolle und Träger, nur die Träger-Administration ändern.
create or replace function app.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
begin
  if (new.role is distinct from old.role
      or new.trager_id is distinct from old.trager_id
      or new.kann_rechte_verwalten is distinct from old.kann_rechte_verwalten
      or new.ist_demo is distinct from old.ist_demo)
     and not (
       app.current_user_role() = 'traeger_admin'
       and old.trager_id = app.current_user_trager_id()
     )
  then
    raise exception 'Nur ein Träger-Admin darf Rolle, Träger-Zuordnung oder Rechte-Verwaltung ändern.';
  end if;
  return new;
end;
$$;
