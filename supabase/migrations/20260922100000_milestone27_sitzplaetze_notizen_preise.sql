-- Milestone 27: Kostenstelle/Cluster an Einrichtungen, Nachrücker-Nachfolge, historischer Notizen-Verlauf,
-- gestaffelte Preise (Variante B).

-- 1. Kostenstelle + Cluster je Einrichtung — frei befüllbar (Buchstaben und Zahlen), für jeden Träger nutzbar.
-- Wirkt sich aktuell nirgends automatisch aus (kein Controlling-Filter) — reine Datenhaltung für später.
alter table public.einrichtungen
  add column kostenstelle text,
  add column cluster text;

-- 2. Nachrücker → Kind, das ersetzt wird (optional). Zeigt den Nachrücker auf der Gruppen-Seite am Platz des
-- referenzierten Kindes statt mit einer eigenen laufenden Nummer.
alter table public.kinder
  add column ersetzt_kind_id uuid references public.kinder(id) on delete set null;

-- 3. Notizen-Verlauf: löst das bisherige, überschreibbare kinder.notizen-Feld ab. Audit-Charakter wie
-- kind_buchungszeit_historie — kein update/delete über die App, eine echte Korrektur macht der Betreiber
-- nötigenfalls per SQL. kinder.notizen bleibt als Spalte für Altdaten/vergangene Auskünfte bestehen, wird aber ab
-- sofort nirgends mehr beschrieben (Drop folgt erst in einer späteren Migration, wenn sich der Verlauf bewährt hat).
create table public.kind_notizen_verlauf (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references public.kinder(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  erstellt_von uuid references public.user_profiles(id) on delete set null,
  erstellt_am timestamptz not null default now()
);
create index kind_notizen_verlauf_kind_idx on public.kind_notizen_verlauf (kind_id, erstellt_am desc);

alter table public.kind_notizen_verlauf enable row level security;

create policy kind_notizen_verlauf_select on public.kind_notizen_verlauf
  for select to authenticated
  using (exists (
    select 1 from public.kinder k
    where k.id = kind_notizen_verlauf.kind_id
      and app.user_has_einrichtung_access(k.einrichtung_id)
  ));

create policy kind_notizen_verlauf_insert on public.kind_notizen_verlauf
  for insert to authenticated
  with check (exists (
    select 1 from public.kinder k
    where k.id = kind_notizen_verlauf.kind_id
      and app.current_user_can_write_belegung(k.einrichtung_id)
  ));

-- Backfill: bestehende notizen-Werte werden zum ersten Verlaufseintrag, damit nichts verloren geht.
insert into public.kind_notizen_verlauf (kind_id, text, erstellt_von, erstellt_am)
select id, notizen, null, created_at
from public.kinder
where notizen is not null and char_length(trim(notizen)) > 0;

-- 4. Preis-Staffel (Variante B): ein fester Kind-Preis wird durch drei Stufen ersetzt (Grenzen 30/60 fest im
-- Anwendungscode, nicht in der Datenbank). Gilt je Einrichtung, nicht gebündelt über den ganzen Träger.
alter table public.listenpreise
  drop column preis_pro_kind,
  add column preis_pro_kind_1_30 numeric(10, 2) check (preis_pro_kind_1_30 >= 0),
  add column preis_pro_kind_31_60 numeric(10, 2) check (preis_pro_kind_31_60 >= 0),
  add column preis_pro_kind_ab_61 numeric(10, 2) check (preis_pro_kind_ab_61 >= 0);

alter table public.trager_abrechnung
  drop column preis_pro_kind,
  add column preis_pro_kind_1_30 numeric check (preis_pro_kind_1_30 is null or preis_pro_kind_1_30 >= 0),
  add column preis_pro_kind_31_60 numeric check (preis_pro_kind_31_60 is null or preis_pro_kind_31_60 >= 0),
  add column preis_pro_kind_ab_61 numeric check (preis_pro_kind_ab_61 is null or preis_pro_kind_ab_61 >= 0);

-- Variante B: Grundgebühr 15 €, gestaffelt 1,20 € / 0,80 € / 0,60 € — ersetzt die alten Demo-Werte (49 €/1,50 €
-- beim Testkunden, noch nicht gesetzte Listenpreise).
update public.listenpreise
set grundgebuehr_pro_einrichtung = 15,
    preis_pro_kind_1_30 = 1.20,
    preis_pro_kind_31_60 = 0.80,
    preis_pro_kind_ab_61 = 0.60,
    updated_at = now()
where id = true;

update public.trager_abrechnung
set preis_grundgebuehr_pro_einrichtung = 15,
    preis_pro_kind_1_30 = 1.20,
    preis_pro_kind_31_60 = 0.80,
    preis_pro_kind_ab_61 = 0.60,
    updated_at = now();
