-- Neue Nutzer mit granularen, pro Einrichtung/Bereich vergebenen Rechten
-- (statt der bisherigen trägerweiten belegung/personal/controlling-Rollen,
-- die durch einrichtung_berechtigungen abgelöst wurden) bekommen die neue
-- Basis-Rolle "mitarbeiter". Die alten Werte bleiben gültig (falls je
-- verwendet), werden aber von der App nicht mehr für Rechteprüfungen
-- genutzt — ausschließlich einrichtung_berechtigungen entscheidet.
alter table public.user_profiles drop constraint user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check
  check (role = any (array['traeger_admin','einrichtungsleitung','belegung','personal','controlling','mitarbeiter']));
