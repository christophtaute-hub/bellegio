-- Solange false, tragen AGB, AVV, TOM, Impressum und Datenschutz einen sichtbaren Entwurfshinweis und die
-- Zustimmungspflicht für Träger-Administratoren ist aus. Der Betreiber setzt den Schalter nach der juristischen Prüfung.
alter table public.betreiber_oeffentlich
  add column rechtstexte_geprueft boolean not null default false;
