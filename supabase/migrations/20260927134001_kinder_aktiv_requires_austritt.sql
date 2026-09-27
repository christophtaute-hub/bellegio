-- Milestone 30, Phase D: aktive Kinder brauchen ein Austrittsdatum — auch Krippenkinder von Anfang an
-- (auf Nachfrage bestätigt: Christoph möchte das bewusst für alle aktiven Kinder, nicht nur Kindergarten).
-- Backfill ist bereits erfolgt (Alters-Heuristik: 3./6. Geburtstag, auf den nächsten 1. September gerundet,
-- zukunftssicher falls das rechnerische Datum bereits in der Vergangenheit läge). Analog zur bestehenden
-- kinder_aktiv_requires_gruppe-Constraint.
alter table public.kinder
  add constraint kinder_aktiv_requires_austritt check (status <> 'aktiv' or austritt is not null);
