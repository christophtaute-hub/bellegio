-- NRW: Kindpauschalen für das Kindergartenjahr 2026/27 auf die amtlichen Werte setzen.
-- Quelle: Landtag NRW, Änderungsantrag Drucksache 18/20466, Anlage 2 zu § 33 KiBiz (Kindpauschalen ab 01.08.2026).
-- Die bisher hinterlegten Werte lagen bei allen neun Kombinationen 1–7 Cent darunter (Rundungsabweichung der ersten Quelle).
-- Korrektur der Live-Zeilen, keine neue Fassung: gültig_ab bleibt 01.08.2026, die Historie (2025/26) bleibt unverändert.
-- Bewusst nicht enthalten: die Reihen für 30 und 40 Wochenstunden (Reform ab 01.08.2027) und die Pauschalen 2027/28 —
-- sie sind noch nicht bekannt, die Auswahllisten würden sie sonst schon heute anbieten.

update public.nrw_kindpauschalen set betrag_jahr = v.betrag
from (values
  ('I', 25, 8029.60), ('I', 35, 10794.41), ('I', 45, 13856.86),
  ('II', 25, 17024.23), ('II', 35, 23036.86), ('II', 45, 29547.79),
  ('III', 25, 6296.03), ('III', 35, 8472.34), ('III', 45, 12311.83)
) as v(gruppenform, stunden, betrag)
where nrw_kindpauschalen.gruppenform = v.gruppenform
  and nrw_kindpauschalen.buchungszeit_stunden = v.stunden
  and nrw_kindpauschalen.gueltig_ab = date '2026-08-01';
