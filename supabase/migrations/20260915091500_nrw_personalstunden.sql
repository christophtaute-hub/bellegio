insert into public.bundeslaender (code, name) values ('nrw', 'Nordrhein-Westfalen');

create table public.nrw_personalstunden (
  id uuid primary key default gen_random_uuid(),
  gruppenform text not null,
  buchungszeit_stunden numeric not null,
  fachkraft_stunden numeric not null,
  ergaenzungskraft_stunden numeric not null,
  leitungsfreistellung_stunden numeric not null,
  bundesland_code text not null default 'nrw' references public.bundeslaender(code),
  unique (gruppenform, buchungszeit_stunden, bundesland_code)
);

alter table public.nrw_personalstunden enable row level security;
create policy nrw_personalstunden_select on public.nrw_personalstunden
  for select to authenticated using (true);

-- Quelle: KiBiz NRW (Stand 01.08.2022), Anlage zu §33 Abs. 1 KiBiz, plus
-- Leitungsfreistellung nach §29 Abs. 2 KiBiz. Die genaue Stunden-Tabelle
-- stammt aus Praktiker-Quellen (Kitazentrale), nicht direkt aus der
-- Primär-PDF (Font-Extraktion fehlgeschlagen) — vor Produktivsetzung mit
-- der Anlage im Original gegenprüfen, siehe Dokumentationsseite. Die
-- Leitungsfreistellung (+5/+7/+9 Std.) wurde einheitlich auf alle drei
-- Gruppenformen angewendet, da die Quelle nicht eindeutig war, für welche
-- Gruppenform(en) genau sie gilt.
insert into public.nrw_personalstunden
  (gruppenform, buchungszeit_stunden, fachkraft_stunden, ergaenzungskraft_stunden, leitungsfreistellung_stunden)
values
  ('I', 25, 55, 0, 5),
  ('I', 35, 77, 0, 7),
  ('I', 45, 99, 0, 9),
  ('II', 25, 55, 0, 5),
  ('II', 35, 77, 0, 7),
  ('II', 45, 99, 0, 9),
  ('III', 25, 27.5, 27.5, 5),
  ('III', 35, 38.5, 38.5, 7),
  ('III', 45, 49.5, 49.5, 9);

alter table public.gruppen
  add column nrw_gruppenform text,
  add column nrw_buchungszeit_stunden numeric;
