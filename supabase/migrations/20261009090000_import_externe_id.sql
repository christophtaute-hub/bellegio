-- Datenübernahme aus Fremdsystemen (KigaRoo für Kinder, rexx für Personal): Fremdschlüssel, damit ein erneuter Import dieselbe Person
-- sicher wiedererkennt und aktualisiert statt zu verdoppeln. Datenquelle: woher die Nummer stammt.

alter table public.kinder
  add column externe_id text check (externe_id is null or length(externe_id) between 1 and 100),
  add column datenquelle text check (datenquelle in ('kigaroo', 'rexx', 'excel'));
alter table public.team
  add column externe_id text check (externe_id is null or length(externe_id) between 1 and 100),
  add column datenquelle text check (datenquelle in ('kigaroo', 'rexx', 'excel'));

create unique index kinder_externe_id_uniq on public.kinder (einrichtung_id, datenquelle, externe_id) where externe_id is not null;
create unique index team_externe_id_uniq on public.team (einrichtung_id, datenquelle, externe_id) where externe_id is not null;
