-- Lokale Admins je Einrichtung (Milestone 29a, Phase 5): ein Nutzer darf für eine einzelne
-- Einrichtung Rechte vergeben, ohne trägerweiten Zugriff (kann_rechte_verwalten) zu bekommen.
-- Eigene Tabelle statt eines Flags auf einrichtung_berechtigungen, da dort bereits vier Zeilen
-- (eine je Bereich) pro Nutzer×Einrichtung existieren — ein Flag müsste sonst über alle vier
-- Zeilen synchron gehalten werden.
create table public.einrichtung_lokale_admins (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, einrichtung_id)
);

alter table public.einrichtung_lokale_admins enable row level security;

create policy einrichtung_lokale_admins_select on public.einrichtung_lokale_admins
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_lokale_admins.user_id
        and up.trager_id = app.current_user_trager_id()
        and app.current_user_role() = 'traeger_admin'
    )
  );

-- Nur die Träger-Administration darf lokale Admins ernennen/entziehen — sonst könnte sich ein
-- lokaler Admin selbst oder andere zu lokalen Admins weiterer Einrichtungen machen.
create policy einrichtung_lokale_admins_insert on public.einrichtung_lokale_admins
  for insert to authenticated
  with check (
    app.current_user_role() = 'traeger_admin'
    and exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_lokale_admins.user_id and up.trager_id = app.current_user_trager_id()
    )
    and exists (
      select 1 from public.einrichtungen e
      where e.id = einrichtung_lokale_admins.einrichtung_id and e.trager_id = app.current_user_trager_id()
    )
  );

create policy einrichtung_lokale_admins_delete on public.einrichtung_lokale_admins
  for delete to authenticated
  using (
    app.current_user_role() = 'traeger_admin'
    and exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_lokale_admins.user_id and up.trager_id = app.current_user_trager_id()
    )
  );

create function app.current_user_ist_lokaler_admin(target_einrichtung_id uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public, pg_catalog
as $$
  select exists (
    select 1 from public.einrichtung_lokale_admins ela
    where ela.user_id = auth.uid()
      and ela.einrichtung_id = target_einrichtung_id
  );
$$;

revoke execute on function app.current_user_ist_lokaler_admin(uuid) from public;
grant execute on function app.current_user_ist_lokaler_admin(uuid) to authenticated;

-- einrichtung_berechtigungen: lokale Admins dürfen Rechte für ihre eigene Einrichtung vergeben,
-- nie mehr als ihr eigenes Niveau (gleiche Kappung wie beim bestehenden kann_rechte_verwalten-Pfad).
drop policy einrichtung_berechtigungen_select on public.einrichtung_berechtigungen;
create policy einrichtung_berechtigungen_select on public.einrichtung_berechtigungen
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from public.user_profiles up
        where up.id = einrichtung_berechtigungen.user_id
          and up.trager_id = app.current_user_trager_id()
      )
      and (
        app.current_user_role() = 'traeger_admin'
        or coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
        or app.current_user_ist_lokaler_admin(einrichtung_berechtigungen.einrichtung_id)
      )
    )
  );

drop policy einrichtung_berechtigungen_insert on public.einrichtung_berechtigungen;
create policy einrichtung_berechtigungen_insert on public.einrichtung_berechtigungen
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_berechtigungen.user_id
        and up.trager_id = app.current_user_trager_id()
    )
    and (
      app.current_user_role() = 'traeger_admin'
      or (
        coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
        and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
      )
      or (
        app.current_user_ist_lokaler_admin(einrichtung_id)
        and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
      )
    )
  );

drop policy einrichtung_berechtigungen_update on public.einrichtung_berechtigungen;
create policy einrichtung_berechtigungen_update on public.einrichtung_berechtigungen
  for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = einrichtung_berechtigungen.user_id
        and up.trager_id = app.current_user_trager_id()
    )
    and (
      app.current_user_role() = 'traeger_admin'
      or coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
      or app.current_user_ist_lokaler_admin(einrichtung_berechtigungen.einrichtung_id)
    )
  )
  with check (
    app.current_user_role() = 'traeger_admin'
    or (
      coalesce((select up2.kann_rechte_verwalten from public.user_profiles up2 where up2.id = auth.uid()), false)
      and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
    )
    or (
      app.current_user_ist_lokaler_admin(einrichtung_id)
      and app.zugriff_rang(app.current_user_zugriff(einrichtung_id, bereich)) >= app.zugriff_rang(zugriff)
    )
  );
