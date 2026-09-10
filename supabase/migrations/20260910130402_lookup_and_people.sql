create table public.booking_time_bands (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  min_hours numeric(3,1) not null,
  max_hours numeric(3,1),
  factor numeric(4,2) not null,
  sort_order int not null default 0
);

create table public.weighting_factors (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  factor numeric(4,2) not null
);

create table public.platzwert_rules (
  id uuid primary key default gen_random_uuid(),
  gruppenart text not null check (gruppenart in ('krippe','kindergarten')),
  age_matches_expected boolean not null,
  platzwert numeric(4,2) not null,
  unique (gruppenart, age_matches_expected)
);

create table public.kinder (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  gruppe_id uuid references public.gruppen(id) on delete set null,
  platznummer text,
  vorname text not null,
  nachname text not null,
  geburtsdatum date not null,
  eintritt date,
  austritt date,
  buchungszeit_band_id uuid references public.booking_time_bands(id),
  notizen text,
  status text not null check (status in ('aktiv','nachruecker','geplant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint kinder_aktiv_requires_gruppe check (status <> 'aktiv' or gruppe_id is not null)
);

create index kinder_einrichtung_id_idx on public.kinder(einrichtung_id);
create index kinder_gruppe_id_idx on public.kinder(gruppe_id);
create index kinder_status_idx on public.kinder(status);

create trigger kinder_set_updated_at
  before update on public.kinder
  for each row execute function public.set_updated_at();

create table public.kind_weighting_factors (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references public.kinder(id) on delete cascade,
  weighting_factor_id uuid not null references public.weighting_factors(id) on delete cascade,
  unique (kind_id, weighting_factor_id)
);

create table public.team (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  gruppe_id uuid references public.gruppen(id) on delete set null,
  vorname text,
  nachname text,
  rolle text,
  wochenstunden numeric(4,2),
  fachkraft boolean not null default false,
  status text not null check (status in ('aktiv','inaktiv','geplant')),
  eintritt date,
  austritt date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index team_einrichtung_id_idx on public.team(einrichtung_id);

create trigger team_set_updated_at
  before update on public.team
  for each row execute function public.set_updated_at();
