-- Milestone 28, Phase 7: Demodaten-Korrektur.
-- Seit Milestone 16 sollten je Demo-Kita eine volle Gruppe (Sollplätze == aktive Kinder) existieren.
-- Nach der Kapazitäts-Auffüllung in Milestone 26 sind die Sollplätze zweier Gruppen über die
-- tatsächliche Kinderzahl gewachsen — beide haben weiterhin genau 1 wartenden Nachrücker, das
-- Zurücksetzen der Sollplätze auf die Ist-Zahl stellt die ursprünglich beabsichtigte
-- "volle Gruppe mit wartendem Nachrücker"-Vorführung wieder her, ohne Kinderdaten anzufassen.
-- Nur die Quell-Kitas unter "Villa Kunterbunt" — die Kopien im Demo-Träger "Bellegio Demo"
-- übernehmen den Stand beim nächsten Zurücksetzen automatisch (scripts/demo-einrichten.ts).
update public.gruppen
set sollplatze = 6
where name = 'Krippengruppe'
  and einrichtung_id = (
    select e.id from public.einrichtungen e
    join public.trager t on t.id = e.trager_id
    where e.name = 'Testkita Bayern' and t.name = 'Villa Kunterbunt'
  );

update public.gruppen
set sollplatze = 8
where name = 'Gruppe II'
  and einrichtung_id = (
    select e.id from public.einrichtungen e
    join public.trager t on t.id = e.trager_id
    where e.name = 'Testkita Nordrhein-Westfalen' and t.name = 'Villa Kunterbunt'
  );
