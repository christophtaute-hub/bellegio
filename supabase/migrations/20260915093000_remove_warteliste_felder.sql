-- Die Warteliste-Funktion (Import + Matching) wurde wieder entfernt, wird
-- nicht gebraucht. Diese Felder waren nur dafür da.
alter table public.kinder
  drop column if exists gewuenschte_betreuungsart,
  drop column if exists warteliste_quelle,
  drop column if exists kontakt_telefon,
  drop column if exists kontakt_email;
