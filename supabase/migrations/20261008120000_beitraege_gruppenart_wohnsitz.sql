-- Elternbeiträge: Preise können nach Gruppenart (Krippe/Kindergarten) und Wohnsitz (am Standort / außerhalb) unterschieden werden,
-- wie in den Preislisten der Träger üblich (Beispiel: Kinderzentren Kunterbunt, München, ab 09/2026).
-- Bestehende Preislisten bleiben unverändert gültig: gruppenart null = gilt für alle Gruppen, auswaertig false = Standardpreis.

alter table public.einrichtung_beitraege
  add column gruppenart text check (gruppenart in ('krippe', 'kindergarten')),
  add column auswaertig boolean not null default false;

alter table public.einrichtung_beitraege
  drop constraint einrichtung_beitraege_einrichtung_id_booking_time_band_id_g_key;

create unique index einrichtung_beitraege_preis_uniq
  on public.einrichtung_beitraege (einrichtung_id, booking_time_band_id, gueltig_ab, coalesce(gruppenart, ''), auswaertig);
