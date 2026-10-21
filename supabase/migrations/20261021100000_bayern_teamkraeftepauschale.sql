-- Bayern ab 2027: Teamkräftepauschale (§ 22 AVBayKiBiG in der Fassung ab 01.01.2027; Gesetz vom 28.07.2026, GVBl. 2026 S. 401).
-- Je genehmigtem Platz, höchstens für 150 Plätze: 2027 → 500,00 € je Platz bis 50 Plätze und 167,61 € je Platz darüber;
-- 2028 und 2029 → 700,00 € / 242,37 €. Voraussetzung: mindestens eine Teamkraft (ab 100 Plätzen mit mindestens 35 Wochenstunden).
-- Rein staatlich, kein kommunaler Anteil. Beträge vorläufig. Wird je Einrichtung nur angesetzt, wenn der Schalter gesetzt ist.

alter table public.bayern_foerderung_basiswert
  add column teamkraefte_bis_50 numeric not null default 0,
  add column teamkraefte_ueber_50 numeric not null default 0,
  add column teamkraefte_max_plaetze integer not null default 150;

alter table public.bayern_foerderung_basiswert_historie
  add column teamkraefte_bis_50 numeric not null default 0,
  add column teamkraefte_ueber_50 numeric not null default 0,
  add column teamkraefte_max_plaetze integer not null default 150;

update public.bayern_foerderung_basiswert_historie set teamkraefte_bis_50 = 500, teamkraefte_ueber_50 = 167.61 where gueltig_ab = date '2027-01-01';
update public.bayern_foerderung_basiswert_historie set teamkraefte_bis_50 = 700, teamkraefte_ueber_50 = 242.37 where gueltig_ab = date '2028-01-01';
update public.bayern_foerderung_basiswert set teamkraefte_bis_50 = 700, teamkraefte_ueber_50 = 242.37 where gueltig_ab = date '2029-01-01';

alter table public.einrichtungen
  add column teamkraefte_pauschale_aktiv boolean not null default false;
