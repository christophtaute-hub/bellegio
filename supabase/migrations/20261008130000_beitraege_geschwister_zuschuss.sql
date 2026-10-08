-- Elternbeiträge: Geschwisterermäßigung und Elternbeitragszuschuss (Bayern).
-- Geschwister: Platz in der Geschwisterreihe je Kind (1 = zahlt den vollen Preis) und je Einrichtung, wie viel Prozent des Preises das 2. bzw. ab dem 3. Kind zahlt.
-- Zuschuss: Bis zu diesem Datum erhalten Eltern von Kindern ab dem 1. September des Kalenderjahres, in dem das Kind drei wird, den Zuschuss
-- (Bayern bis 31.12.2026). Der Zuschuss ändert die Einnahmen nicht (die Einrichtung erhält ihn und gibt ihn weiter) — Kinder mit Zuschuss bekommen aber keine Geschwisterermäßigung.

alter table public.kinder
  add column geschwister_nummer smallint not null default 1 check (geschwister_nummer between 1 and 10);

alter table public.einrichtungen
  add column geschwister_zweit_prozent numeric check (geschwister_zweit_prozent between 0 and 100),
  add column geschwister_ab_dritt_prozent numeric check (geschwister_ab_dritt_prozent between 0 and 100),
  add column elternbeitragszuschuss_bis date;
