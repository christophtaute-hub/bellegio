-- Milestone 34: Zusatzfelder der Einrichtungs-Finanzen.
-- Personalprogramme (Personalbonus, Assistenzkraft-/Sprachfachkraftförderung) werden NIE pauschal angesetzt: NULL = nicht
-- angesetzt; nur wenn die Einrichtung einen Betrag einträgt, fließt er als eigene Zeile in die Fördererlöse.
-- Sonstige Kosten (Miete, Verpflegung, Sachkosten) sind ein vom Träger eingetragener Monatsbetrag und mindern das Ergebnis.
alter table public.einrichtungen
  add column personalprogramme_foerderung_monatlich numeric null check (personalprogramme_foerderung_monatlich >= 0),
  add column sonstige_kosten_monatlich numeric not null default 0 check (sonstige_kosten_monatlich >= 0);

comment on column public.einrichtungen.personalprogramme_foerderung_monatlich is
  'Förderung aus Personalprogrammen je Monat; null = nicht angesetzt (nur eintragen, wenn die Fördervoraussetzungen erfüllt sind).';
comment on column public.einrichtungen.sonstige_kosten_monatlich is
  'Sonstige monatliche Kosten (Sachkosten, Miete, Verpflegung), vom Träger eingetragen.';
