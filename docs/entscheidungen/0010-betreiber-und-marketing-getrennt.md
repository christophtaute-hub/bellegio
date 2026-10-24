# 0010 — Betreiber-Zentrale und Marketing-Modul als getrennte Bereiche

**Frage:** Wie bekommen Betreiber (Rechnungen, Kunden) und Marketing (Ampeln über alle Einrichtungen) Zugriff, ohne Kinder- und Personaldaten zu öffnen?

**Entscheidung:** Beide Bereiche haben eigene Routen-Gruppen (`/admin`, `/marketing`), eigene Tabellen und einen **eigenen Zugriffspfad**. Der Betreiber steht in `platform_operators` (nur per SQL eintragbar), Marketing hat ein eigenes trägerweites Recht (`marketing_zugang`, ansehen/bearbeiten). Marketing liest Stammdaten über speziell abgesicherte Abfragen (`marketing_einrichtungen()`), nicht über die Einrichtungstabelle; Kinder- und Teamtabellen bleiben unzugänglich. Rechnungen sieht nur der Betreiber.

**Warum:** Ein Recht auf „irgendeinen Bereich“ hätte sonst automatisch Lesezugriff auf Kinder und Personal gegeben. Bestehende Funktionen sollten durch das neue Modul nicht verändert werden.

**Folgen:**
- Neue Funktionen mit `SECURITY DEFINER` sind per RPC sichtbar (zwei bewusste Hinweise des Security-Advisors, jeweils selbst abgesichert).
- Träger-Administratoren sehen **keine** Abrechnung (auch nicht über die Datenbank, geprüft mit `supabase/tests/betreiber_zugriff.sql`); nur der Betreiber, in der Oberfläche **„System-Admin“** genannt.

**Fundstellen:** `app/(admin)/`, `app/(marketing)/`, `lib/marketing/`, `supabase/migrations/20261019090000_marketing_fundament.sql`, `supabase/tests/marketing_zugriff.sql`, `supabase/tests/betreiber_zugriff.sql`.
