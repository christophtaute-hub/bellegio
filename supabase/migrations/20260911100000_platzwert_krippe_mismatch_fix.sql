-- Bugfix: BayKiBiG Betriebserlaubnis-Platzwert für ein Krippenkind, das
-- bereits 3 Jahre oder älter ist, ist 0.5 (nicht 2) — bestätigt gegen die
-- reale, von der Einrichtung genutzte Personalbelegungsliste.
update public.platzwert_rules
set platzwert = 0.5
where gruppenart = 'krippe' and age_matches_expected = false;
