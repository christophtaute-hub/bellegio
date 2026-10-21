# 0008 — Historien statt Überschreiben

**Frage:** Was passiert mit Daten, die sich ändern (Buchungszeit, Gruppe, Notizen, Stunden)?

**Entscheidung:** Was für Auswertungen zu einem Stichtag zählt, wird als Verlauf gespeichert, nicht überschrieben: `kind_buchungszeit_historie`, `kind_gruppen_historie`, `kind_notizen_verlauf`, `team_monthly_hours`. Die Kind-Historien sind nur anfügbar (kein Ändern, kein Löschen über die App); die Monatsstunden im Team sind dagegen bearbeitbare Monatswerte, die Änderungen stehen im Änderungsprotokoll. Dazu kommen Änderungsprotokolle für Kinder und Team.

**Warum:** Ein Blick auf einen vergangenen oder künftigen Stichtag muss die damalige bzw. geplante Lage zeigen, sonst sind Forecast und Meldung verfälscht. Das Protokoll beantwortet „wer hat was wann geändert“.

**Folgen:**
- Die Tagesansicht der Kinder löst Buchungszeit und Gruppe über die Historie zum Stichtag auf.
- Frühere Werte vor Einführung einer Historie lassen sich nicht rekonstruieren (Platzhalter `2000-01-01`).
- Spalten wie `kinder.buchungszeit_band_id` bleiben als „aktueller Wert“ erhalten, sind aber nicht mehr die Quelle für Stichtagsauswertungen.

**Fundstellen:** `supabase/migrations/20260922090000_kind_buchungszeit_historie.sql`, `20261005100000_kind_gruppen_historie.sql`, `lib/kinder/buchungszeit-historie.ts`, `components/kinder/aenderungshistorie.tsx`.
