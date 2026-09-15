-- Neues, optionales Datum je Kind: bis wann der aktuelle Betreuungsvertrag/
-- die Buchungszeit gilt. Dient der neuen Hinweis-Box im Belegungsmanagement
-- (Milestone 8, Phase I), um rechtzeitig auf anstehende Verlängerungen
-- hinzuweisen — unabhängig vom (endgültigen) Austrittsdatum.
alter table public.kinder
  add column vertrag_gueltig_bis date;
