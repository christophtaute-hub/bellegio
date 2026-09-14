create table public.kinder_audit_log (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references public.kinder(id) on delete cascade,
  changed_by uuid references public.user_profiles(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb not null
);
create index kinder_audit_log_kind_id_idx on public.kinder_audit_log(kind_id);

create or replace function public.log_kinder_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.kinder_audit_log (kind_id, changed_by, old_data, new_data)
  values (
    new.id,
    auth.uid(),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger kinder_audit_log_trigger
  after insert or update on public.kinder
  for each row execute function public.log_kinder_change();

alter table public.kinder_audit_log enable row level security;

create policy kinder_audit_log_select on public.kinder_audit_log
  for select to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_id and app.user_has_einrichtung_access(k.einrichtung_id)
  ));
