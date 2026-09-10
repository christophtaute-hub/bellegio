create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.trager (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trager_set_updated_at
  before update on public.trager
  for each row execute function public.set_updated_at();

create table public.einrichtungen (
  id uuid primary key default gen_random_uuid(),
  trager_id uuid not null references public.trager(id) on delete cascade,
  name text not null,
  address_street text,
  address_zip text,
  address_city text,
  kita_year_start_month smallint not null default 9 check (kita_year_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index einrichtungen_trager_id_idx on public.einrichtungen(trager_id);

create trigger einrichtungen_set_updated_at
  before update on public.einrichtungen
  for each row execute function public.set_updated_at();

create table public.gruppen (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  name text not null,
  sollplatze numeric(5,2) not null default 0 check (sollplatze >= 0),
  gruppenart text not null check (gruppenart in ('krippe','kindergarten','hort','altersgemischt')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index gruppen_einrichtung_id_idx on public.gruppen(einrichtung_id);

create trigger gruppen_set_updated_at
  before update on public.gruppen
  for each row execute function public.set_updated_at();
