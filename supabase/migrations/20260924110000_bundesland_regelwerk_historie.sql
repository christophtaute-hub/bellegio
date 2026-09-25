-- Milestone 29b: zentrales versioniertes Bundesland-Regelwerk. Bisher hielten die 6 Tabellen mit
-- gesetzlichen Konstanten (weighting_factors, booking_time_bands, platzwert_rules, staffing_rules,
-- bw_personalschluessel, nrw_personalstunden) genau EINEN aktuellen Wert je Regel — Forecast/
-- Controlling für einen vergangenen oder zukünftigen Monat nutzten also immer "was heute gilt".
-- Das wird falsch, sobald sich ein Gesetz ändert (z.B. NRW-KiBiz-Reform, in Kraft ab Kitajahr
-- 2027/2028) und würde dann rückwirkend auch vergangene Monatsberichte verfälschen.
--
-- Muster wie kind_buchungszeit_historie: KEIN Trigger. Gesetzesänderungen sind selten, bewusst und
-- werden von Hand per Migration nachgezogen (0 wertändernde UPDATEs an diesen 6 Tabellen über alle
-- bisherigen 51 Migrationen — nur ein Bugfix und zwei reine Label-Umbenennungen). Ein Trigger, der
-- automatisch "heute" als Stichtag einträgt, wäre oft schlicht falsch: das gesetzliche Inkrafttreten
-- (z.B. "ab Kitajahr 2027/2028") wird vom Gesetz bestimmt, nicht vom Zeitpunkt der Migration.
--
-- Struktur: jede Zeile der 6 Live-Tabellen bekommt gueltig_ab (seit wann ihre AKTUELLEN Werte
-- gelten). Bei einer echten Gesetzesänderung schreibt ein Mensch eine Migration, die (a) die ALTEN
-- Werte in die neue <table>_historie-Tabelle verschiebt (gueltig_bis = Inkrafttretedatum der Reform)
-- und (b) die Live-Zeile per UPDATE auf die neuen Werte setzt (gueltig_ab = dasselbe Datum). Die
-- Zeilen-id bleibt dabei unverändert — bestehende Fremdschlüssel (kinder.buchungszeit_band_id,
-- kind_weighting_factors.weighting_factor_id) zeigen weiterhin korrekt auf "die heutige Fassung
-- dieser Regel", nur ihre Werte ändern sich über die Zeit. "Welche Fassung galt am Stichtag X" wird
-- in TypeScript aufgelöst (lib/regelwerk/verlauf.ts), analog zu resolveBandAmStichtag.
--
-- RUNBOOK für eine echte Gesetzesänderung (z.B. sobald die NRW-2027-Werte feststehen): neue
-- Migration, die je betroffener Tabelle (1) die ALTEN Werte per INSERT in <table>_historie einträgt
-- mit gueltig_bis = dem tatsächlichen gesetzlichen Inkrafttretedatum (nicht dem Datum, an dem die
-- Migration geschrieben wird), und (2) die Live-Zeile per UPDATE auf die neuen Werte setzt, mit
-- gueltig_ab = demselben Datum. Diese Migration erst AM ODER NACH dem echten Inkrafttretedatum
-- deployen, nie vorab — sonst zeigen "heute"-Ansichten (Szenario-Rechner, Dashboard-Stichtag) die
-- neuen Werte, bevor sie rechtlich gelten.
--
-- Default '2000-01-01' für gueltig_ab der Bestandszeilen ist ein ehrlicher Platzhalter — echte
-- Rechtshistorie vor Einführung dieses Features lässt sich nicht rekonstruieren (gleiche
-- Einschränkung wie beim kind_buchungszeit_historie-Backfill).

alter table public.weighting_factors add column gueltig_ab date not null default '2000-01-01';
alter table public.booking_time_bands add column gueltig_ab date not null default '2000-01-01';
alter table public.platzwert_rules add column gueltig_ab date not null default '2000-01-01';
alter table public.staffing_rules add column gueltig_ab date not null default '2000-01-01';
alter table public.bw_personalschluessel add column gueltig_ab date not null default '2000-01-01';
alter table public.nrw_personalstunden add column gueltig_ab date not null default '2000-01-01';

create table public.weighting_factors_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.weighting_factors(id) on delete cascade,
  code text not null,
  label text not null,
  factor numeric(4,2) not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint weighting_factors_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index weighting_factors_historie_quelle_idx on public.weighting_factors_historie (quelle_id, gueltig_ab desc);

create table public.booking_time_bands_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.booking_time_bands(id) on delete cascade,
  label text not null,
  min_hours numeric(3,1) not null,
  max_hours numeric(3,1),
  factor numeric(4,2) not null,
  sort_order int not null default 0,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint booking_time_bands_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index booking_time_bands_historie_quelle_idx on public.booking_time_bands_historie (quelle_id, gueltig_ab desc);

create table public.platzwert_rules_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.platzwert_rules(id) on delete cascade,
  gruppenart text not null check (gruppenart in ('krippe','kindergarten')),
  age_matches_expected boolean not null,
  platzwert numeric(4,2) not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint platzwert_rules_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index platzwert_rules_historie_quelle_idx on public.platzwert_rules_historie (quelle_id, gueltig_ab desc);

-- staffing_rules hat bundesland_code als natürlichen Primärschlüssel (keine uuid id) — die Historie
-- referenziert daher direkt diesen Schlüssel statt eines quelle_id.
create table public.staffing_rules_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_bundesland_code text not null references public.staffing_rules(bundesland_code) on delete cascade,
  mindestschluessel numeric not null,
  fachkraftquote_anteil numeric not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint staffing_rules_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index staffing_rules_historie_quelle_idx on public.staffing_rules_historie (quelle_bundesland_code, gueltig_ab desc);

create table public.bw_personalschluessel_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.bw_personalschluessel(id) on delete cascade,
  betriebsform text not null,
  altersmischung boolean not null default false,
  referenz_oeffnungszeit_stunden numeric not null,
  referenz_vzae numeric not null,
  stellen_pro_stunde numeric not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint bw_personalschluessel_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index bw_personalschluessel_historie_quelle_idx on public.bw_personalschluessel_historie (quelle_id, gueltig_ab desc);

create table public.nrw_personalstunden_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.nrw_personalstunden(id) on delete cascade,
  gruppenform text not null,
  buchungszeit_stunden numeric not null,
  fachkraft_stunden numeric not null,
  ergaenzungskraft_stunden numeric not null,
  leitungsfreistellung_stunden numeric not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint nrw_personalstunden_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index nrw_personalstunden_historie_quelle_idx on public.nrw_personalstunden_historie (quelle_id, gueltig_ab desc);

-- RLS: gleiche offene Lesepolitik wie die Live-Tabellen (geteilte Referenzdaten, kein Mandanten-
-- bezug). Kein Insert/Update/Delete für authenticated — Historie entsteht ausschließlich über die
-- Migration, die eine echte Gesetzesänderung nachzieht (Migrations-Runner/service_role umgehen RLS).
alter table public.weighting_factors_historie enable row level security;
alter table public.booking_time_bands_historie enable row level security;
alter table public.platzwert_rules_historie enable row level security;
alter table public.staffing_rules_historie enable row level security;
alter table public.bw_personalschluessel_historie enable row level security;
alter table public.nrw_personalstunden_historie enable row level security;

create policy weighting_factors_historie_select on public.weighting_factors_historie
  for select to authenticated using (true);
create policy booking_time_bands_historie_select on public.booking_time_bands_historie
  for select to authenticated using (true);
create policy platzwert_rules_historie_select on public.platzwert_rules_historie
  for select to authenticated using (true);
create policy staffing_rules_historie_select on public.staffing_rules_historie
  for select to authenticated using (true);
create policy bw_personalschluessel_historie_select on public.bw_personalschluessel_historie
  for select to authenticated using (true);
create policy nrw_personalstunden_historie_select on public.nrw_personalstunden_historie
  for select to authenticated using (true);
