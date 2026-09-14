-- Damit die Änderungshistorie (kinder_audit_log) den Namen des Nutzers
-- zeigen kann, der die Änderung vorgenommen hat, müssen alle Nutzer:innen
-- desselben Trägers die full_name-Spalten der anderen Träger-Mitglieder
-- lesen können (nicht nur traeger_admin, wie bisher).
drop policy user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
  for select to authenticated
  using (id = (select auth.uid()) or trager_id = app.current_user_trager_id());
