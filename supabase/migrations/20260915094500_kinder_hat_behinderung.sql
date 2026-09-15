-- Bundeslandunabhängiges Merkmal "Kind mit (drohender) Behinderung" — bewusst
-- getrennt vom bayerischen Integrationskinder-Gewichtungsfaktor (der
-- ausschließlich die AS-Berechnung speist), da Baden-Württemberg und NRW
-- Behinderung qualitativ statt über einen Gewichtungsfaktor abbilden.
-- Dient u.a. der jährlichen Kinder- und Jugendhilfestatistik-Kategorisierung.
alter table public.kinder
  add column hat_behinderung boolean not null default false;
