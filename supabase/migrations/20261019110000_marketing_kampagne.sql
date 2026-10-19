-- Milestone 35, M3: Marketing-Kampagnen je Einrichtung (reine Dokumentation, keine Anzeigenschaltung). Kein Löschen:
-- Status „beendet“ statt löschen, der Verlauf bleibt über das Protokoll (Trigger).
create table public.marketing_kampagne (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  art text not null check (art in ('personal', 'belegung')),
  kanal text not null check (kanal in ('meta', 'google', 'sonstige')),
  beworbenes text not null check (char_length(beworbenes) between 1 and 200),
  anzahl integer check (anzahl >= 0),
  beginn date,
  ende date,
  status text not null default 'geplant' check (status in ('geplant', 'aktiv', 'pausiert', 'beendet')),
  budget numeric check (budget >= 0),
  kosten numeric check (kosten >= 0),
  links text[] not null default '{}',
  verantwortlich_user_id uuid references public.user_profiles(id) on delete set null,
  kommentar text check (kommentar is null or char_length(kommentar) <= 2000),
  naechster_schritt text check (naechster_schritt is null or char_length(naechster_schritt) <= 500),
  schritt_faellig date,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ende is null or beginn is null or ende >= beginn)
);
create index marketing_kampagne_einrichtung_idx on public.marketing_kampagne (einrichtung_id, status);

alter table public.marketing_kampagne enable row level security;

create policy marketing_kampagne_select on public.marketing_kampagne
  for select to authenticated
  using (app.marketing_darf(einrichtung_id, 'ansehen'));

create policy marketing_kampagne_insert on public.marketing_kampagne
  for insert to authenticated
  with check (app.marketing_darf(einrichtung_id, 'bearbeiten') and created_by = auth.uid());

create policy marketing_kampagne_update on public.marketing_kampagne
  for update to authenticated
  using (app.marketing_darf(einrichtung_id, 'bearbeiten'))
  with check (app.marketing_darf(einrichtung_id, 'bearbeiten'));

create trigger marketing_kampagne_protokoll
  after insert or update on public.marketing_kampagne
  for each row execute function app.marketing_protokollieren();
