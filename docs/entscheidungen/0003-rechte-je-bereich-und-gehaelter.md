# 0003 — Rechte je Bereich und Einrichtung; Einzelgehälter als eigenes Recht

**Frage:** Reichen feste Rollen („Leitung“, „Mitarbeiter“), oder braucht es feinere Rechte?

**Entscheidung:** Rechte werden je Nutzer, Einrichtung und Bereich vergeben (Belegung, Personal, Controlling, Szenario/Planung, Finanzübersicht, Einzelgehälter) mit den Stufen „kein Zugriff / ansehen / bearbeiten“. Der Träger-Administrator hat alles; die Einrichtungsleitung bekommt Standardrechte ohne Finanzen und Gehälter, die sich je Einrichtung ausdrücklich überschreiben lassen. Die Oberfläche zeigt je Bereich zwei Ein/Aus-Schalter.

**Warum:** Eine Leitung soll Kinder und Personal pflegen, aber nicht jede Mitarbeiterin soll das Controlling oder fremde Gehälter sehen. Die Praxis verlangt Mischformen (z. B. Verwaltung mit Controlling, ohne Personal).

**Folgen:**
- **Gehälter liegen in einer eigenen Tabelle `team_verguetung`**, nicht als Spalten auf `team`. Grund: Jeder mit irgendeinem Bereichsrecht darf die ganze `team`-Zeile lesen, und das Änderungsprotokoll hätte Gehaltsfelder an alle durchgereicht.
- „Finanzübersicht“ (nur Summen) und „Einzelgehälter“ sind getrennte Rechte. Wer nur Summen sehen darf, bekommt sie aus einer serverseitig berechneten Summe, ohne Einzelwerte (siehe 0009).
- Lokale Administratoren je Einrichtung können Rechte in ihrer Einrichtung vergeben, aber weder trägerweite Aktionen auslösen noch sich selbst höherstufen.

**Fundstellen:** `lib/nutzer/verwaltung.ts`, `components/einstellungen/rechte-matrix.tsx`, Migrationen `20260915100000_granulares_rechte_system.sql`, `20260925090000_finanzen_bereich.sql`, `20261005110000_gehaelter_recht.sql`.
