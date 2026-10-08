-- Rückmeldung aus Baden-Württemberg (08.10.2026):
-- * Buchungskategorie "50,5h-55h" für Baden-Württemberg
-- * Kind: Kooperation (Ja/Nein), I-Status mit Gültigkeitszeitraum
-- * Einrichtung auf einen Blick: Kontakt-/Organisationsdaten je Einrichtung
insert into public.booking_time_bands (label, min_hours, max_hours, factor, sort_order, bundesland_code)
select '50,5h-55h', 50.5, 55, 1.00, 7, 'bw'
where not exists (select 1 from public.booking_time_bands where bundesland_code = 'bw' and label = '50,5h-55h');

alter table public.kinder
  add column kooperation boolean not null default false,
  add column i_status_von date,
  add column i_status_bis date,
  add constraint kinder_i_status_zeitraum check (i_status_von is null or i_status_bis is null or i_status_bis >= i_status_von);

alter table public.einrichtungen
  add column telefon text,
  add column email text,
  add column leitung_name text,
  add column oeffnungszeiten text,
  add column schliesszeiten text,
  add column basisinfos text;
