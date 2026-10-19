-- Milestone 35, M2: Marketing-Bewertung je Einrichtung (vier Ampeln + Zusatzwerte). Eine Zeile je Einrichtung; der Verlauf
-- steht im Protokoll (Trigger). Alle Ampelwerte sind NULL, solange nicht bewertet wurde.
create table public.marketing_bewertung (
  einrichtung_id uuid primary key references public.einrichtungen(id) on delete cascade,
  regionalleitung_user_id uuid references public.user_profiles(id) on delete set null,
  ampel_personalbedarf smallint check (ampel_personalbedarf between 0 and 3),
  ampel_personelle_qualitaet smallint check (ampel_personelle_qualitaet between 0 and 2),
  ampel_paedagogische_qualitaet smallint check (ampel_paedagogische_qualitaet between 0 and 2),
  ampel_belegung smallint check (ampel_belegung between 0 and 3),
  fehlende_stunden_woche numeric check (fehlende_stunden_woche >= 0),
  offene_stellen integer check (offene_stellen >= 0),
  freie_plaetze_u3 integer check (freie_plaetze_u3 >= 0),
  freie_plaetze_ue3 integer check (freie_plaetze_ue3 >= 0),
  leitung_performance smallint check (leitung_performance between 1 and 10),
  kommentar text check (kommentar is null or char_length(kommentar) <= 2000),
  bewertet_am timestamptz,
  bewertet_von uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.marketing_bewertung enable row level security;

create policy marketing_bewertung_select on public.marketing_bewertung
  for select to authenticated
  using (app.marketing_darf(einrichtung_id, 'ansehen'));

create policy marketing_bewertung_insert on public.marketing_bewertung
  for insert to authenticated
  with check (app.marketing_darf(einrichtung_id, 'bearbeiten'));

create policy marketing_bewertung_update on public.marketing_bewertung
  for update to authenticated
  using (app.marketing_darf(einrichtung_id, 'bearbeiten'))
  with check (app.marketing_darf(einrichtung_id, 'bearbeiten'));

create trigger marketing_bewertung_protokoll
  after insert or update on public.marketing_bewertung
  for each row execute function app.marketing_protokollieren();
