-- NRW-Kindpauschalen vervollständigt (Gruppenform I, II, III × 25/35/45 Std.) und auf das Kindergartenjahr 2026/27 fortgeschrieben.
--
-- Quelle: Stadt Ratingen, Beschlussvorlage 10/2026 vom 02.02.2026 (Verteilung der KiBiz-Kindpauschalen 2026/2027). Sie gibt die vom Land
-- gewährten Finanzierungspauschalen (EUR je Kind und Kindergartenjahr) für 2026/27 und, in Klammern, für 2025/26 wieder. Zwei
-- Plausibilitätschecks: (1) die 2025/26-Werte der Gruppenform I stimmen mit den bisher hinterlegten Werten überein; (2) das Verhältnis
-- 2026/27 zu 2025/26 ist durchgehend 0,9986 (= im Text genannte Absenkung um 0,14 % durch die Fortschreibungsrate nach § 37 KiBiz).
-- NICHT geprüft gegen die Primärquelle (KiBiz.web / Erlass des Ministeriums): vor Produktivbetrieb dort gegenchecken.
-- Nicht abgebildet: Einzelintegration (eigene, deutlich höhere Pauschalen), Zuschläge nach §§ 34/35 (Miete, Eingruppen-/Waldkita).
--
-- Vorgehen wie im Runbook von 20260924110000_bundesland_regelwerk_historie: alte Werte in die Historie (gueltig_bis = Beginn des
-- Kindergartenjahres 2026/27 = 01.08.2026), Live-Zeilen auf die neuen Werte mit gueltig_ab = 01.08.2026.

-- 1. Gruppenform II und III existierten bisher nicht: zunächst mit den Werten 2025/26 anlegen (gleiche Behandlung wie Gruppenform I)
insert into public.nrw_kindpauschalen (gruppenform, buchungszeit_stunden, betrag_jahr, gueltig_ab) values
  ('II', 25, 17048.03, '2025-08-01'),
  ('II', 35, 23069.12, '2025-08-01'),
  ('II', 45, 29589.19, '2025-08-01'),
  ('III', 25, 6304.84, '2025-08-01'),
  ('III', 35, 8484.20, '2025-08-01'),
  ('III', 45, 12329.08, '2025-08-01');

-- 2. Alle neun 2025/26-Fassungen in die Historie
insert into public.nrw_kindpauschalen_historie (quelle_id, gruppenform, buchungszeit_stunden, betrag_jahr, bundesland_code, gueltig_ab, gueltig_bis)
select id, gruppenform, buchungszeit_stunden, betrag_jahr, bundesland_code, gueltig_ab, date '2026-08-01'
from public.nrw_kindpauschalen;

-- 3. Live-Zeilen auf 2026/27
update public.nrw_kindpauschalen k
set betrag_jahr = n.betrag, gueltig_ab = date '2026-08-01'
from (values
  ('I', 25, 8029.57), ('I', 35, 10794.38), ('I', 45, 13856.85),
  ('II', 25, 17024.16), ('II', 35, 23036.82), ('II', 45, 29547.77),
  ('III', 25, 6296.01), ('III', 35, 8472.32), ('III', 45, 12311.82)
) as n(gruppenform, stunden, betrag)
where k.gruppenform = n.gruppenform and k.buchungszeit_stunden = n.stunden and k.bundesland_code = 'nrw';
