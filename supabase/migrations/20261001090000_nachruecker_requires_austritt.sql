-- Milestone 31, Punkt B: auch Nachrücker brauchen ein Austrittsdatum, nicht nur aktive Kinder
-- (Rückmeldung von Christoph). Ersetzt kinder_aktiv_requires_austritt aus Milestone 30, Phase D durch
-- dieselbe Prüfung für beide Status. Backfill der bestehenden nachruecker-Zeilen erfolgt separat per SQL
-- (gleiche Alters-Heuristik wie beim ursprünglichen Backfill: 3./6. Geburtstag, auf den nächsten
-- 1. September gerundet).
alter table public.kinder
  drop constraint kinder_aktiv_requires_austritt;

alter table public.kinder
  add constraint kinder_aktiv_requires_austritt check (status not in ('aktiv', 'nachruecker') or austritt is not null);
