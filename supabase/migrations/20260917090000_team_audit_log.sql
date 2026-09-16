-- Spiegelt kinder_audit_log (20260914090100) 1:1 für die team-Tabelle, damit
-- Personal-Änderungen genauso nachvollziehbar sind wie Kinder-Änderungen.
create table public.team_audit_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team(id) on delete cascade,
  changed_by uuid references public.user_profiles(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb not null
);
create index team_audit_log_team_id_idx on public.team_audit_log(team_id);

create or replace function public.log_team_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.team_audit_log (team_id, changed_by, old_data, new_data)
  values (
    new.id,
    auth.uid(),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger team_audit_log_trigger
  after insert or update on public.team
  for each row execute function public.log_team_change();

alter table public.team_audit_log enable row level security;

create policy team_audit_log_select on public.team_audit_log
  for select to authenticated
  using (exists (
    select 1 from public.team t
    where t.id = team_id and app.user_has_einrichtung_access(t.einrichtung_id)
  ));
