create table public.demo_anfragen (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  organisation text not null check (char_length(organisation) between 1 and 160),
  bundesland text not null default 'andere' check (bundesland in ('by', 'bw', 'nrw', 'andere')),
  email text not null check (char_length(email) between 3 and 200 and position('@' in email) > 1),
  nachricht text check (nachricht is null or char_length(nachricht) <= 2000),
  status text not null default 'neu' check (status in ('neu', 'bearbeitet')),
  created_at timestamptz not null default now()
);
alter table public.demo_anfragen enable row level security;

-- Öffentliches Kontaktformular der Landingpage: anonym darf nur eingefügt werden, nie gelesen.
create policy demo_anfragen_insert on public.demo_anfragen
  for insert to anon, authenticated
  with check (status = 'neu');
create policy demo_anfragen_operator on public.demo_anfragen
  for all to authenticated
  using (app.is_platform_operator())
  with check (app.is_platform_operator());
