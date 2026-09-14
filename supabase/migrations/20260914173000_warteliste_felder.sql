alter table public.kinder
  add column gewuenschte_betreuungsart text
    check (gewuenschte_betreuungsart in ('krippe','kindergarten','hort','altersgemischt')),
  add column warteliste_quelle text,
  add column kontakt_telefon text,
  add column kontakt_email text;
