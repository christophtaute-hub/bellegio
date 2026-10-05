-- Milestone 33, Phase 4: Rechtsstand 01.10.2026 — Bayern-Reform 2027.
-- Quelle: StMAS-Handreichung zur Reform des BayKiBiG, IFKM, BayMBl. 2025 Nr. 557 (Art. 21/23 BayKiBiG).
-- * 2026: Basiswert 1.563,88 €, Qualitätsbonus 268,01 € (gilt bis 31.12.2026, bestätigt).
-- * Ab 01.01.2027: Qualitätsbonus vorläufig 693,28 € (2027), 852,36 € (2028), 857,87 € (2029), dem Basiswert aufgeschlagen
--   (Formel unverändert: (Basiswert + Qualitätsbonus) × Buchungszeitfaktor × Gewichtungsfaktor).
-- * Basiswert 2027ff.: vom StMAS noch nicht bekanntgegeben — bis dahin mit 1.563,88 € fortgeschrieben (VORLÄUFIG). Sobald die
--   Bekanntmachung vorliegt, die Zeilen für 2027/2028 hier nachziehen (update der Historie-Zeile, gleiches Muster wie unten).
-- * Nicht abgebildet: Teamkräftepauschale (2027: 500 € je Platz bis 50 Plätze, 167,61 € darüber; 2028/29: 700 € / 242,37 €),
--   Wegfall von Elternbeitragszuschuss und U3-Bundesmitteln, Eigenanteil der Gemeinde (Art. 22).
--
-- Die aktuelle Zeile (live) wird zur letzten bekannten Fassung (2029); die Fassungen davor stehen in der Historie mit
-- ausdrücklichem Ablauf (siehe Runbook in 20260924110000_bundesland_regelwerk_historie.sql). Die Auflösung nach Stichtag
-- übernimmt lib/regelwerk/verlauf.ts — Ansichten für heute zeigen also weiter die 2026er Werte.

with live as (select id, basiswert, qualitaetsbonus, bundesland_code from public.bayern_foerderung_basiswert where bundesland_code = 'by')
insert into public.bayern_foerderung_basiswert_historie (quelle_id, basiswert, qualitaetsbonus, bundesland_code, gueltig_ab, gueltig_bis)
select live.id, v.basiswert, v.qb, live.bundesland_code, v.ab, v.bis
from live,
  (values
    (1563.88::numeric, 268.01::numeric, date '2026-01-01', date '2027-01-01'),
    (1563.88::numeric, 693.28::numeric, date '2027-01-01', date '2028-01-01'),
    (1563.88::numeric, 852.36::numeric, date '2028-01-01', date '2029-01-01')
  ) as v(basiswert, qb, ab, bis);

update public.bayern_foerderung_basiswert
set basiswert = 1563.88, qualitaetsbonus = 857.87, gueltig_ab = date '2029-01-01'
where bundesland_code = 'by';
