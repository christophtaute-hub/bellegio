-- Milestone 32, Phase A: Rechnungen und Abrechnungsdaten sind ausschließlich für den Betreiber (Admin) sichtbar.
-- Bisher durfte ein Träger-Admin seine eigenen, nicht-entworfenen Rechnungen und die Abrechnungsdaten seines
-- Trägers lesen (Kundensicht "Abrechnung"). Diese Sicht gibt es nicht mehr; ohne Entzug der Policies bliebe der Zugriff
-- über die API offen. Die Betreiber-Policies (*_operator) bleiben unverändert.
drop policy if exists rechnungen_traeger_admin_select on public.rechnungen;
drop policy if exists rechnungspositionen_traeger_admin_select on public.rechnungspositionen;
drop policy if exists trager_abrechnung_traeger_admin_select on public.trager_abrechnung;
