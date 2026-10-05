-- Milestone 33, Phase 5: interne Preisliste (Elternbeiträge) je Einrichtung und Buchungszeit-Band.
-- Nur wer das Recht 'finanzen' hat, sieht und pflegt sie. Mehrere Fassungen über gueltig_ab: gilt die jüngste Preisliste,
-- die zum Stichtag schon gültig war. Das Band-Feld 'factor' ist ein Förderfaktor (Bayern) und wird hier NICHT als Preis genutzt.
create table public.einrichtung_beitraege (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  booking_time_band_id uuid not null references public.booking_time_bands(id) on delete cascade,
  betrag_monat numeric not null check (betrag_monat >= 0),
  gueltig_ab date not null default date '2000-01-01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (einrichtung_id, booking_time_band_id, gueltig_ab)
);
create index einrichtung_beitraege_einrichtung_idx on public.einrichtung_beitraege (einrichtung_id, gueltig_ab);
create trigger einrichtung_beitraege_set_updated_at
  before update on public.einrichtung_beitraege
  for each row execute function public.set_updated_at();

alter table public.einrichtung_beitraege enable row level security;

create policy einrichtung_beitraege_select on public.einrichtung_beitraege
  for select to authenticated using (app.current_user_can_view_finanzen(einrichtung_id));
create policy einrichtung_beitraege_insert on public.einrichtung_beitraege
  for insert to authenticated with check (app.current_user_can_write_finanzen(einrichtung_id));
create policy einrichtung_beitraege_update on public.einrichtung_beitraege
  for update to authenticated
  using (app.current_user_can_write_finanzen(einrichtung_id))
  with check (app.current_user_can_write_finanzen(einrichtung_id));
create policy einrichtung_beitraege_delete on public.einrichtung_beitraege
  for delete to authenticated using (app.current_user_can_write_finanzen(einrichtung_id));
