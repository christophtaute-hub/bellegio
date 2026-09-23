-- Milestone 28, Phase 3: Betreiberdaten für Impressum/Datenschutz aktualisieren.
-- Neuer Betreiber/neue Anschrift laut Christophs Rückmeldung vom 2026-09-23.
-- E-Mail-Tippfehler ("belegio.de") wurde per Rückfrage als Tippfehler bestätigt,
-- es bleibt bei der bestehenden Domain bellegio.de.
update public.betreiber_oeffentlich
set
  firmenname = 'Christoph Taute Akademie',
  anschrift = 'Krusauer Straße 36' || chr(10) || '38302 Wolfenbüttel',
  email = 'support@bellegio.de'
where id = true;

-- Steuernummer folgt noch — sichtbarer Platzhaltertext im Impressum statt
-- einer erfundenen Nummer (per Rückfrage bestätigt).
update public.betreiber_einstellungen
set steuernummer = 'folgt'
where id = true;
