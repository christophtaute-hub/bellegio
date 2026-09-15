-- NRW: reale Wochenstunden-Bänder pro Kind (Zeitk.), bestätigt durch eine
-- echte Personalbelegungsliste — deckt sich mit den bereits vorhandenen
-- Gruppen-Buchungszeit-Bändern (gruppen.nrw_buchungszeit_stunden).
insert into public.booking_time_bands (bundesland_code, label, min_hours, max_hours, factor, sort_order)
values
  ('nrw', '25h', 25, 25, 1.0, 1),
  ('nrw', '35h', 35, 35, 1.0, 2),
  ('nrw', '45h', 45, 45, 1.0, 3);

-- BW: reale 5-Std.-Schritt-Wochenstunden-Bänder pro Kind (Zeitk.), Label-
-- Format exakt wie in der echten Kita-Excel ("30,5h-35h" etc.). Die unteren
-- beiden Bänder (20,5-25h/25,5-30h) sind nicht direkt aus der Beispieldatei
-- belegt, sondern zur Vollständigkeit ergänzt (die Datei zeigte nur ab
-- 30,5h belegte Kinder) — vor Live-Einsatz mit dem Jugendamt/der Kita
-- abgleichen. `factor` ist wie bei NRW ein reiner Platzhalter, da BW keine
-- Buchungszeitfaktor-Formel kennt (siehe Dokumentation).
insert into public.booking_time_bands (bundesland_code, label, min_hours, max_hours, factor, sort_order)
values
  ('bw', '20,5h-25h', 20.5, 25, 1.0, 1),
  ('bw', '25,5h-30h', 25.5, 30, 1.0, 2),
  ('bw', '30,5h-35h', 30.5, 35, 1.0, 3),
  ('bw', '35,5h-40h', 35.5, 40, 1.0, 4),
  ('bw', '40,5h-45h', 40.5, 45, 1.0, 5),
  ('bw', '45,5h-50h', 45.5, 50, 1.0, 6);
