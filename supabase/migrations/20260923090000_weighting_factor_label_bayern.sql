-- Milestone 28, Phase 2: Fördermerkmal-Label Bayern präzisieren.
-- Statt der pauschalen Bezeichnung "Migrationskind" wird das BayKiBiG-Merkmal
-- (§ 24 AVBayKiBiG, Gewichtungsfaktor 1,3) präzise benannt: "Eltern beide
-- nichtdeutschsprachiger Herkunft". Der Code (nicht_deutschsprachig) und der
-- Faktor (1,3) bleiben unverändert — nur das Anzeige-Label ändert sich.
update public.weighting_factors
set label = 'Eltern beide nichtdeutschsprachiger Herkunft'
where code = 'nicht_deutschsprachig' and bundesland_code = 'by';
