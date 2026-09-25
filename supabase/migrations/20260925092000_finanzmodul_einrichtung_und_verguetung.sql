-- Milestone 29c: Finanzfelder auf einrichtungen + team_verguetung (Personalkosten-Basis je
-- Mitarbeiter). Gehaltsdaten bewusst NICHT als Spalten auf team, siehe Begründung unten.

-- 1. Einrichtungen: manueller Förderbetrag (universeller Override, für BW faktisch Pflichtfeld, da
-- keine Landesformel existiert; für BY/NRW optionale Korrektur, falls der echte Zuwendungsbescheid
-- vom Formel-Ergebnis abweicht — "Planungshilfe, keine Behördenauskunft", gleiche Haltung wie an
-- anderer Stelle im Projekt), Lohnnebenkosten%, Jahressonderzahlung% (beide nur Schätzwerte mit
-- widersprüchlichen Quellen laut Recherche, daher konfigurierbar statt hartkodiert).
alter table public.einrichtungen
  add column foerderung_monatlich_manuell numeric null,
  add column lohnnebenkosten_prozent numeric not null default 28
    check (lohnnebenkosten_prozent >= 0 and lohnnebenkosten_prozent <= 100),
  add column jahressonderzahlung_prozent numeric not null default 85
    check (jahressonderzahlung_prozent >= 0 and jahressonderzahlung_prozent <= 100);

comment on column public.einrichtungen.foerderung_monatlich_manuell is
  'Manueller monatlicher Fördererlös-Überschreib. Hat in lib/finanzen/foerdererloese.ts IMMER Vorrang
   vor der berechneten Formel. Für Baden-Württemberg faktisch Pflichtfeld (keine Landesformel
   existiert), für Bayern/NRW optionaler Korrekturwert.';

-- 2. Neue Update-Policy für finanzen-Editoren. einrichtungen_update (traeger_admin-only) bleibt
-- unverändert bestehen und regelt weiterhin alle anderen Felder.
create policy einrichtungen_update_finanzen on public.einrichtungen
  for update to authenticated
  using (app.current_user_can_write_finanzen(id))
  with check (app.current_user_can_write_finanzen(id));

-- 3. Spalten-Guard: RLS selbst ist nicht spaltenscharf — ohne diesen Trigger könnte ein
-- finanzen-'bearbeiten'-Nutzer ohne traeger_admin über die neue Policy auch Name/Adresse/Bundesland
-- der Einrichtung ändern. Gleiches Muster wie app.prevent_self_role_escalation (user_profiles,
-- 20260915100000_granulares_rechte_system.sql), hier auf einrichtungen angewendet.
create or replace function app.restrict_einrichtungen_finanzen_columns()
returns trigger
language plpgsql
security definer
set search_path = app, public, pg_catalog
as $$
begin
  if app.current_user_role() = 'traeger_admin' then
    return new;
  end if;
  if new.name is distinct from old.name
     or new.address_street is distinct from old.address_street
     or new.address_zip is distinct from old.address_zip
     or new.address_city is distinct from old.address_city
     or new.kita_year_start_month is distinct from old.kita_year_start_month
     or new.bundesland_code is distinct from old.bundesland_code
     or new.vollzeit_wochenstunden is distinct from old.vollzeit_wochenstunden
     or new.empfohlener_anstellungsschluessel is distinct from old.empfohlener_anstellungsschluessel
     or new.trager_id is distinct from old.trager_id
     or new.archived_at is distinct from old.archived_at
     or new.standort_gemeinde is distinct from old.standort_gemeinde
     or new.auswaertigen_quote_prozent is distinct from old.auswaertigen_quote_prozent
     or new.loeschfrist_monate is distinct from old.loeschfrist_monate
     or new.kostenstelle is distinct from old.kostenstelle
     or new.cluster is distinct from old.cluster
  then
    raise exception 'Nur Träger-Admin darf diese Felder der Einrichtung ändern.';
  end if;
  return new;
end;
$$;

create trigger einrichtungen_restrict_finanzen_columns
  before update on public.einrichtungen
  for each row execute function app.restrict_einrichtungen_finanzen_columns();

-- 4. team_verguetung: 1:1 mit team, ABSICHTLICH eine eigene Tabelle statt Spalten auf team.
-- team_select erlaubt jedem Nutzer mit irgendeinem Bereichs-Zugriff (auch nur belegung) select * auf
-- team (app.user_has_einrichtung_access), und der bestehende team_audit_log-Trigger protokolliert
-- unbedingt die GANZE Zeile in eine Tabelle mit derselben breiten Lese-Policy. Gehaltsfelder als
-- team-Spalten würden also über das bestehende Änderungsprotokoll an jeden mit z.B. nur
-- Belegungs-Zugriff durchsickern. Eine eigene Tabelle mit eigener RLS ist der einzig sichere Weg in
-- diesem RLS-Modell.
create table public.team_verguetung (
  team_id uuid primary key references public.team(id) on delete cascade,
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  entgeltgruppe text null,
  stufe int null check (stufe between 1 and 6),
  monatsgehalt_manuell numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index team_verguetung_einrichtung_id_idx on public.team_verguetung(einrichtung_id);
create trigger team_verguetung_set_updated_at
  before update on public.team_verguetung
  for each row execute function public.set_updated_at();

comment on column public.team_verguetung.monatsgehalt_manuell is
  'TVöD-SuE ist nicht universell (Caritas/Diakonie nutzen AVR, private Träger zahlen frei) — dieser
   Override ersetzt entgeltgruppe/stufe komplett, wenn gesetzt. entgeltgruppe/stufe sind der
   optionale Komfortpfad über die TVöD-Tabelle, kein Pflichtfeld.';

alter table public.team_verguetung enable row level security;

-- einrichtung_id ist denormalisiert (statt über team gejoint), damit die Policy ohne Subquery über
-- team auskommt; insert/update prüfen per exists, dass sie zum echten team.einrichtung_id passt.
create policy team_verguetung_select on public.team_verguetung
  for select to authenticated
  using (app.current_user_can_view_finanzen(einrichtung_id));

create policy team_verguetung_insert on public.team_verguetung
  for insert to authenticated
  with check (
    app.current_user_can_write_finanzen(einrichtung_id)
    and exists (select 1 from public.team t where t.id = team_id and t.einrichtung_id = team_verguetung.einrichtung_id)
  );

create policy team_verguetung_update on public.team_verguetung
  for update to authenticated
  using (app.current_user_can_write_finanzen(einrichtung_id))
  with check (
    app.current_user_can_write_finanzen(einrichtung_id)
    and exists (select 1 from public.team t where t.id = team_id and t.einrichtung_id = team_verguetung.einrichtung_id)
  );

create policy team_verguetung_delete on public.team_verguetung
  for delete to authenticated
  using (app.current_user_can_write_finanzen(einrichtung_id));

-- 5. Eigenes Audit-Log für team_verguetung, RLS-gleich auf finanzen-Sicht beschränkt — ein
-- geteiltes/generisches Audit-Log (wie team_audit_log) würde das Gehaltsleck sonst über die
-- Hintertür wieder öffnen.
create table public.team_verguetung_audit_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team(id) on delete cascade,
  einrichtung_id uuid not null,
  changed_by uuid references public.user_profiles(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb not null
);
create index team_verguetung_audit_log_team_id_idx on public.team_verguetung_audit_log(team_id);

create or replace function public.log_team_verguetung_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.team_verguetung_audit_log (team_id, einrichtung_id, changed_by, old_data, new_data)
  values (
    new.team_id, new.einrichtung_id, auth.uid(),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger team_verguetung_audit_log_trigger
  after insert or update on public.team_verguetung
  for each row execute function public.log_team_verguetung_change();

-- log_team_verguetung_change() ist als SECURITY DEFINER-Funktion sonst direkt per RPC
-- (/rest/v1/rpc/log_team_verguetung_change) durch jeden angemeldeten Nutzer aufrufbar — gleiche
-- Lehre wie log_team_change() (20260917090500_team_audit_log_revoke_rpc_execute.sql). Der Trigger
-- selbst funktioniert unverändert weiter (Trigger-Aufrufe sind von EXECUTE-Rechten unabhängig).
revoke execute on function public.log_team_verguetung_change() from public, anon, authenticated;

alter table public.team_verguetung_audit_log enable row level security;
create policy team_verguetung_audit_log_select on public.team_verguetung_audit_log
  for select to authenticated
  using (app.current_user_can_view_finanzen(einrichtung_id));
