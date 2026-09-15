insert into public.bundeslaender (code, name) values ('bw', 'Baden-Württemberg');

create table public.bw_personalschluessel (
  id uuid primary key default gen_random_uuid(),
  betriebsform text not null,
  altersmischung boolean not null default false,
  referenz_oeffnungszeit_stunden numeric not null,
  referenz_vzae numeric not null,
  stellen_pro_stunde numeric not null,
  bundesland_code text not null default 'bw' references public.bundeslaender(code),
  unique (betriebsform, altersmischung, bundesland_code)
);

alter table public.bw_personalschluessel enable row level security;
create policy bw_personalschluessel_select on public.bw_personalschluessel
  for select to authenticated using (true);

-- Quelle: KiTaVO Baden-Württemberg (konsolidierte Fassung 2023) §1, bestätigt
-- durch KVJS-Rundschreiben 14/2021 Anlage 2 (Ausführungshinweise +
-- Berechnungshilfe zum Personalbedarf). stellen_pro_stunde ist für
-- Regelgruppe ohne Altersmischung direkt durch das KVJS-Rechenbeispiel
-- bestätigt (0,300 Stellen/Std.); die übrigen Zeilen folgen derselben
-- linearen Skalierungsregel (referenz_vzae ÷ referenz_oeffnungszeit_stunden),
-- sind aber nicht einzeln primärquellenbestätigt — siehe Dokumentationsseite.
insert into public.bw_personalschluessel
  (betriebsform, altersmischung, referenz_oeffnungszeit_stunden, referenz_vzae, stellen_pro_stunde)
values
  ('halbtagsgruppe', false, 4, 1.3, 0.325),
  ('halbtagsgruppe', true, 4, 1.4, 0.350),
  ('regelgruppe', false, 6, 1.8, 0.300),
  ('regelgruppe', true, 6, 2.0, 0.333),
  ('verlaengerte_oeffnungszeit', false, 6, 1.9, 0.317),
  ('verlaengerte_oeffnungszeit', true, 6, 2.0, 0.333),
  ('ganztagsgruppe', false, 7, 2.3, 0.329),
  ('kinderkrippe', false, 7, 2.06, 0.294);

alter table public.gruppen
  add column bw_betriebsform text,
  add column bw_altersmischung boolean not null default false,
  add column bw_oeffnungszeit_stunden numeric;
