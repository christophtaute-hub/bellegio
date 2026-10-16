-- Milestone 34: Maßnahmen zu den Kita-Ampeln (Belegung/Personal) — "Was wurde wann von wem gemacht?".
-- Jede Maßnahme ist ein Eintrag mit Verfasser und Zeitpunkt. Löschen gibt es nicht (Verlauf bleibt); abgeschlossene
-- Maßnahmen werden als erledigt markiert (Wer/Wann wird festgehalten).
create table public.massnahmen (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  bereich text not null check (bereich in ('belegung', 'personal')),
  typ text not null,
  titel text not null check (char_length(titel) between 1 and 200),
  notiz text check (notiz is null or char_length(notiz) <= 2000),
  ziel_monat date,
  status text not null default 'offen' check (status in ('offen', 'erledigt')),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  erledigt_von uuid references public.user_profiles(id) on delete set null,
  erledigt_am timestamptz
);
create index massnahmen_einrichtung_idx on public.massnahmen (einrichtung_id, bereich, created_at desc);

alter table public.massnahmen enable row level security;

create policy massnahmen_select on public.massnahmen
  for select to authenticated
  using (app.user_has_einrichtung_access(einrichtung_id));

create policy massnahmen_insert on public.massnahmen
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and case bereich
      when 'belegung' then app.current_user_can_write_belegung(einrichtung_id)
      else app.current_user_can_write_personal(einrichtung_id)
    end
  );

create policy massnahmen_update on public.massnahmen
  for update to authenticated
  using (
    case bereich
      when 'belegung' then app.current_user_can_write_belegung(einrichtung_id)
      else app.current_user_can_write_personal(einrichtung_id)
    end
  )
  with check (
    case bereich
      when 'belegung' then app.current_user_can_write_belegung(einrichtung_id)
      else app.current_user_can_write_personal(einrichtung_id)
    end
  );
