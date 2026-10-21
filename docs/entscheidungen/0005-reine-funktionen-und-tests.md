# 0005 — Rechenlogik als reine Funktionen mit handgerechneten Tests

**Frage:** Wie stellen wir sicher, dass Kunden sich auf die Zahlen verlassen können?

**Entscheidung:** Jede Rechenregel (Schlüssel, Förderung, Personalkosten, Kategorisierung, Ampeln) ist eine reine Funktion ohne Datenbankzugriff. Daten laden und Rechnen sind getrennt. Neue Regeln bekommen zuerst einen **handgerechneten** Testfall; die Demo-Zahlen werden zusätzlich per unabhängiger SQL-Nachrechnung abgeglichen.

**Warum:** Reine Funktionen sind schnell und eindeutig testbar. Ein handgerechneter Wert prüft die Formel, nicht nur, dass der Code sich selbst bestätigt.

**Folgen:**
- Rund 450 automatische Tests (`tests/`), dazu SQL-Prüfungen für die Zugriffsregeln.
- Der Abgleich zeigt Konsistenz, ersetzt aber keine Prüfung durch eine Fachperson oder eine echte Meldung (siehe `docs/betrieb/risiken-und-luecken-verkauf.md`).

**Fundstellen:** `tests/`, `lib/finanzen/`, `lib/team/`, `docs/betrieb/zahlenabgleich-demo.md`, `scripts/ergebnis-pruefen.ts`.
