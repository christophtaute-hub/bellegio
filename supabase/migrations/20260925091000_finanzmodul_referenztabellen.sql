-- Milestone 29c: versionierte Regelwerk-Tabellen für das Finanzmodul (Fördererlöse Bayern/NRW,
-- Personalkosten TVöD SuE). Gleiches Muster wie Milestone 29b (20260924110000): Live-Zeile mit
-- gueltig_ab + <table>_historie mit gueltig_ab/gueltig_bis, offene Lese-RLS, keine Schreib-Policy
-- für authenticated — eine echte Änderung (neuer Basiswert, neue KiBiz-Kindpauschale, neue
-- Tarifrunde) wird von Hand per Migration nachgezogen, siehe das Runbook in 20260924110000.

-- Bayern: Basiswert × Buchungszeitfaktor × Gewichtungsfaktor + Qualitätsbonus, Art. 21 BayKiBiG.
create table public.bayern_foerderung_basiswert (
  id uuid primary key default gen_random_uuid(),
  basiswert numeric not null,
  qualitaetsbonus numeric not null,
  bundesland_code text not null default 'by' references public.bundeslaender(code),
  gueltig_ab date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bayern_foerderung_basiswert_set_updated_at
  before update on public.bayern_foerderung_basiswert
  for each row execute function public.set_updated_at();

-- Quelle: BayMBl. 2025-3 (verkuendung-bayern.de/baymbl/2025-3), bekanntgegeben 05.12.2025.
-- Reform zum 01.01.2027 restrukturiert Teile dieser Berechnung — dann analog zum Runbook in
-- 20260924110000_bundesland_regelwerk_historie.sql nachziehen.
insert into public.bayern_foerderung_basiswert (basiswert, qualitaetsbonus, gueltig_ab)
values (1563.88, 268.01, '2026-01-01');

create table public.bayern_foerderung_basiswert_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.bayern_foerderung_basiswert(id) on delete cascade,
  basiswert numeric not null,
  qualitaetsbonus numeric not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint bayern_foerderung_basiswert_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index bayern_foerderung_basiswert_historie_quelle_idx
  on public.bayern_foerderung_basiswert_historie (quelle_id, gueltig_ab desc);

-- NRW: Kindpauschale je Gruppenform × Buchungszeitband, KiBiz §§32-34/§37 — gleiche Schlüssel-
-- struktur wie die bestehende nrw_personalstunden-Tabelle.
-- ACHTUNG: Werte NICHT unabhängig gegen die Primärquelle (KiBiz.web) geprüft (Praktiker-Quellen,
-- gleiche Einschränkung wie nrw_personalstunden, siehe dessen Doc-Kommentar). Nur Gruppenform I
-- recherchiert; II/III fehlen und müssen vor NRW-Produktivbetrieb nachgetragen werden (bewusste
-- Lücke, nicht erfunden — siehe Dokumentationsseite).
create table public.nrw_kindpauschalen (
  id uuid primary key default gen_random_uuid(),
  gruppenform text not null,
  buchungszeit_stunden numeric not null,
  betrag_jahr numeric not null,
  bundesland_code text not null default 'nrw' references public.bundeslaender(code),
  gueltig_ab date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gruppenform, buchungszeit_stunden, bundesland_code)
);
create trigger nrw_kindpauschalen_set_updated_at
  before update on public.nrw_kindpauschalen
  for each row execute function public.set_updated_at();

insert into public.nrw_kindpauschalen (gruppenform, buchungszeit_stunden, betrag_jahr, gueltig_ab) values
  ('I', 25, 8040.83, '2025-08-01'),
  ('I', 35, 10809.51, '2025-08-01'),
  ('I', 45, 13876.28, '2025-08-01');

create table public.nrw_kindpauschalen_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.nrw_kindpauschalen(id) on delete cascade,
  gruppenform text not null,
  buchungszeit_stunden numeric not null,
  betrag_jahr numeric not null,
  bundesland_code text not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint nrw_kindpauschalen_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index nrw_kindpauschalen_historie_quelle_idx on public.nrw_kindpauschalen_historie (quelle_id, gueltig_ab desc);

-- TVöD SuE Entgelttabelle (Personalkosten). Bundesweit einheitlich (kein bundesland_code) — anders
-- als die drei Länder-Regelwerk-Tabellen ist dies ein Tarifvertrag, kein Landesgesetz. Nicht
-- universell: kirchliche Träger (Caritas/Diakonie) nutzen AVR, private Träger zahlen frei — daher
-- bekommt jedes team_verguetung-Mitglied zusätzlich ein manuelles Gehalts-Override.
-- ACHTUNG: Tabelle nicht gegen die primäre VKA/dbb-Quelle geprüft (Quelle: öffentlicher-dienst.info,
-- Stand 01.05.2026-31.03.2027) — vor Produktivbetrieb einmal gegenchecken.
create table public.tvoed_sue_entgelt (
  id uuid primary key default gen_random_uuid(),
  entgeltgruppe text not null,
  stufe int not null check (stufe between 1 and 6),
  monatsbetrag numeric not null,
  gueltig_ab date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entgeltgruppe, stufe, gueltig_ab)
);
create trigger tvoed_sue_entgelt_set_updated_at
  before update on public.tvoed_sue_entgelt
  for each row execute function public.set_updated_at();

insert into public.tvoed_sue_entgelt (entgeltgruppe, stufe, monatsbetrag, gueltig_ab) values
  ('S3', 1, 3743.84, '2026-05-01'), ('S3', 2, 3984.06, '2026-05-01'), ('S3', 3, 4207.54, '2026-05-01'),
  ('S3', 4, 4412.74, '2026-05-01'), ('S3', 5, 4506.62, '2026-05-01'), ('S3', 6, 4618.78, '2026-05-01'),
  ('S4', 1, 3949.75, '2026-05-01'), ('S4', 2, 4205.05, '2026-05-01'), ('S4', 3, 4437.67, '2026-05-01'),
  ('S4', 4, 4595.53, '2026-05-01'), ('S4', 5, 4747.64, '2026-05-01'), ('S4', 6, 4987.60, '2026-05-01'),
  ('S8a', 1, 4211.33, '2026-05-01'), ('S8a', 2, 4485.76, '2026-05-01'), ('S8a', 3, 4772.18, '2026-05-01'),
  ('S8a', 4, 5048.50, '2026-05-01'), ('S8a', 5, 5318.59, '2026-05-01'), ('S8a', 6, 5602.61, '2026-05-01'),
  ('S8b', 1, 4294.64, '2026-05-01'), ('S8b', 2, 4575.17, '2026-05-01'), ('S8b', 3, 4910.33, '2026-05-01'),
  ('S8b', 4, 5404.18, '2026-05-01'), ('S8b', 5, 5871.11, '2026-05-01'), ('S8b', 6, 6229.08, '2026-05-01'),
  ('S9', 1, 4378.42, '2026-05-01'), ('S9', 2, 4664.90, '2026-05-01'), ('S9', 3, 5000.03, '2026-05-01'),
  ('S9', 4, 5496.02, '2026-05-01'), ('S9', 5, 5965.19, '2026-05-01'), ('S9', 6, 6327.12, '2026-05-01'),
  ('S11a', 1, 4615.50, '2026-05-01'), ('S11a', 2, 4927.34, '2026-05-01'), ('S11a', 3, 5149.78, '2026-05-01'),
  ('S11a', 4, 5719.60, '2026-05-01'), ('S11a', 5, 6166.43, '2026-05-01'), ('S11a', 6, 6434.54, '2026-05-01'),
  ('S11b', 1, 4698.14, '2026-05-01'), ('S11b', 2, 5017.43, '2026-05-01'), ('S11b', 3, 5241.76, '2026-05-01'),
  ('S11b', 4, 5813.74, '2026-05-01'), ('S11b', 5, 6260.57, '2026-05-01'), ('S11b', 6, 6528.68, '2026-05-01'),
  ('S13', 1, 4773.64, '2026-05-01'), ('S13', 2, 5098.44, '2026-05-01'), ('S13', 3, 5540.87, '2026-05-01'),
  ('S13', 4, 5898.31, '2026-05-01'), ('S13', 5, 6345.17, '2026-05-01'), ('S13', 6, 6568.60, '2026-05-01'),
  ('S15', 1, 4935.22, '2026-05-01'), ('S15', 2, 5272.72, '2026-05-01'), ('S15', 3, 5630.24, '2026-05-01'),
  ('S15', 4, 6041.33, '2026-05-01'), ('S15', 5, 6702.68, '2026-05-01'), ('S15', 6, 6988.63, '2026-05-01'),
  ('S16', 1, 5115.95, '2026-05-01'), ('S16', 2, 5469.38, '2026-05-01'), ('S16', 3, 5862.59, '2026-05-01'),
  ('S16', 4, 6345.17, '2026-05-01'), ('S16', 5, 6881.38, '2026-05-01'), ('S16', 6, 7203.13, '2026-05-01'),
  ('S17', 1, 5222.87, '2026-05-01'), ('S17', 2, 5585.54, '2026-05-01'), ('S17', 3, 6166.43, '2026-05-01'),
  ('S17', 4, 6523.96, '2026-05-01'), ('S17', 5, 7238.88, '2026-05-01'), ('S17', 6, 7658.90, '2026-05-01'),
  ('S18', 1, 5664.62, '2026-05-01'), ('S18', 2, 5808.95, '2026-05-01'), ('S18', 3, 6523.96, '2026-05-01'),
  ('S18', 4, 7060.15, '2026-05-01'), ('S18', 5, 7864.48, '2026-05-01'), ('S18', 6, 8355.97, '2026-05-01');

create table public.tvoed_sue_entgelt_historie (
  id uuid primary key default gen_random_uuid(),
  quelle_id uuid not null references public.tvoed_sue_entgelt(id) on delete cascade,
  entgeltgruppe text not null,
  stufe int not null,
  monatsbetrag numeric not null,
  gueltig_ab date not null,
  gueltig_bis date not null,
  created_at timestamptz not null default now(),
  constraint tvoed_sue_entgelt_historie_zeitraum check (gueltig_ab < gueltig_bis)
);
create index tvoed_sue_entgelt_historie_quelle_idx on public.tvoed_sue_entgelt_historie (quelle_id, gueltig_ab desc);

alter table public.bayern_foerderung_basiswert enable row level security;
alter table public.bayern_foerderung_basiswert_historie enable row level security;
alter table public.nrw_kindpauschalen enable row level security;
alter table public.nrw_kindpauschalen_historie enable row level security;
alter table public.tvoed_sue_entgelt enable row level security;
alter table public.tvoed_sue_entgelt_historie enable row level security;

create policy bayern_foerderung_basiswert_select on public.bayern_foerderung_basiswert for select to authenticated using (true);
create policy bayern_foerderung_basiswert_historie_select on public.bayern_foerderung_basiswert_historie for select to authenticated using (true);
create policy nrw_kindpauschalen_select on public.nrw_kindpauschalen for select to authenticated using (true);
create policy nrw_kindpauschalen_historie_select on public.nrw_kindpauschalen_historie for select to authenticated using (true);
create policy tvoed_sue_entgelt_select on public.tvoed_sue_entgelt for select to authenticated using (true);
create policy tvoed_sue_entgelt_historie_select on public.tvoed_sue_entgelt_historie for select to authenticated using (true);
