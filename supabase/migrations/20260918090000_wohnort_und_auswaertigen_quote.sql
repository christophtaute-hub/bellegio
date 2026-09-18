alter table public.kinder
  add column wohnort text;

alter table public.einrichtungen
  add column standort_gemeinde text,
  add column auswaertigen_quote_prozent numeric;

comment on column public.einrichtungen.auswaertigen_quote_prozent is
  'Nur gesetzt, wenn diese Einrichtung einer lokalen kommunalen Satzung zur Begrenzung auswärtiger Kinder unterliegt (z.B. Stuttgart, Heidelberg) — NULL bedeutet: Regel nicht aktiv. Rein beratender Hinweis, keine Sperre.';
