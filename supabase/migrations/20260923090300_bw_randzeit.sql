-- Milestone 28, Phase 9: Randzeiten im BW-Mindestpersonalschlüssel.
-- § 1 Abs. 2 KiTaVO: die durchschnittliche tägliche Öffnungszeit besteht (außer bei der reinen
-- Halbtags-/Regelgruppe ohne Altersmischung) aus Hauptbetreuungszeit + Randzeit, die Randzeit ist
-- gesetzlich mit 1 Stunde angesetzt; weicht die tatsächliche Randzeit davon ab, ändert sich der
-- Mindestpersonalschlüssel entsprechend. Bisher wurde nur ein einziger Gesamt-Öffnungszeitwert
-- erfasst und linear skaliert (ungenau bei abweichender Randzeit). NULL = gesetzlicher Standardwert
-- (1 Stunde), genau wie bei bw_oeffnungszeit_stunden mit dem Referenzwert verfahren wird.
alter table public.gruppen add column bw_randzeit_stunden numeric;
