create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  trager_id uuid not null references public.trager(id) on delete cascade,
  role text not null check (role in ('traeger_admin','einrichtungsleitung')),
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_trager_id_idx on public.user_profiles(trager_id);

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create table public.user_einrichtungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, einrichtung_id)
);

create index user_einrichtungen_user_id_idx on public.user_einrichtungen(user_id);
create index user_einrichtungen_einrichtung_id_idx on public.user_einrichtungen(einrichtung_id);
