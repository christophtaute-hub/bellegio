# Dokumentation — Bellegio

Bellegio ist ein Steuerungsinstrument für Kitas in Bayern, Baden-Württemberg und Nordrhein-Westfalen: *Wo läuft es? Warum? Was muss ich tun?* — für Belegung, Personal und Geld.

## Für wen ist was?

| Du bist … | Beginne hier |
| --- | --- |
| **Kita-Leitung, Verwaltung, Träger** und willst die App nutzen | [Handbuch](handbuch/README.md) (auch in der App: Einstellungen → Hilfe) |
| **neu im Projekt** und willst es in fünf Minuten verstehen | [Überblick](ueberblick.md) → [Entscheidungen](entscheidungen/README.md) |
| **Entwickler** | [Architektur](architektur/architektur.md) → [Datenmodell](architektur/datenmodell.md) → [Rechenlogik](architektur/rechenlogik.md) |
| **Prüfer, Anwalt, Steuerberater, Datenschutz** | [Entscheidungen 0002, 0003, 0009, 0014](entscheidungen/README.md), [Betrieb](betrieb/anwalt-und-steuerberater.md) |
| **Betreiber** (Go-live, Betrieb, Risiken) | [Go-live-Checkliste](betrieb/go-live-checkliste.md), [Produktion einrichten](betrieb/produktion-einrichten.md), [Risiken](betrieb/risiken-und-luecken-verkauf.md) |

## Inhalt

- **[ueberblick.md](ueberblick.md)** — Bellegio auf einer Seite.
- **[funktionen.md](funktionen.md)** — alle Funktionen mit Rolle, Route und Fundstelle im Code.
- **[handbuch/](handbuch/README.md)** — Bedienung in einfacher Sprache, Glossar, häufige Fragen.
- **[architektur/](architektur/architektur.md)** — Aufbau, [Datenmodell](architektur/datenmodell.md), [Rechenlogik](architektur/rechenlogik.md), [Entwicklungsnotizen](architektur/entwicklungsnotizen.md).
- **[entscheidungen/](entscheidungen/README.md)** — warum es so gebaut ist: eine Datei je Entscheidung.
- **[betrieb/](betrieb/go-live-checkliste.md)** — Go-live-Checkliste, Produktion, Risiken, Anwalt/Steuerberater, Zahlenabgleich.

Die genauen **Gesetzeswerte mit Quellen und Prüfstand** stehen in der App unter Einstellungen → Rechtsgrundlagen.

## Pflegen

Siehe „Dokumentation pflegen“ in der [README](../README.md). Ein Test (`tests/doku.test.ts`) prüft, dass Links stimmen, jede Seite der App in der Funktionsübersicht steht und jede Entscheidung im Index.

## Stand

Aufgestellt am 21.10.2026 (nach Milestone 36). Was nicht belegt werden konnte, steht als „nicht dokumentiert“ oder „unklar“ im Text.
