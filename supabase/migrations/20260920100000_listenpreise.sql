-- Öffentliche Listenpreise für die Landingpage: eine Zeile, für alle lesbar (auch ohne Anmeldung),
-- schreibbar nur für den Betreiber. Individuelle Kundenpreise bleiben in trager_abrechnung.
create table public.listenpreise (
  id boolean primary key default true check (id),
  grundgebuehr_pro_einrichtung numeric(10, 2) check (grundgebuehr_pro_einrichtung >= 0),
  preis_pro_kind numeric(10, 2) check (preis_pro_kind >= 0),
  hinweis text check (char_length(hinweis) <= 500),
  updated_at timestamptz not null default now()
);

insert into public.listenpreise (id) values (true);

alter table public.listenpreise enable row level security;

create policy listenpreise_lesen on public.listenpreise
  for select to anon, authenticated
  using (true);

create policy listenpreise_betreiber_aendern on public.listenpreise
  for update to authenticated
  using ((select app.is_platform_operator()))
  with check ((select app.is_platform_operator()));

-- Keine Insert-/Delete-Policy: die Zeile existiert genau einmal und bleibt bestehen.
