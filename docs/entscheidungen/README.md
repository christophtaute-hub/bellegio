# Entscheidungen — warum Bellegio so gebaut ist

Jede Datei beantwortet eine Frage: **Was haben wir entschieden, warum, und was folgt daraus?** Sie sind kurz (eine Bildschirmseite) und nennen die Stelle im Code. Wer verstehen will, warum etwas so und nicht anders gelöst ist, beginnt hier.

| Nr. | Entscheidung | Kurz |
| --- | --- | --- |
| [0001](0001-next-und-supabase.md) | Next.js und Supabase | Ein Repository, keine eigene API, Anmeldung und Datenbank fertig |
| [0002](0002-zugriff-im-zeilenschutz.md) | Zugriffsschutz in der Datenbank | Rechte gelten auch, wenn jemand die Oberfläche umgeht |
| [0003](0003-rechte-je-bereich-und-gehaelter.md) | Rechte je Bereich, Gehälter getrennt | Fein einstellbar; Gehälter in eigener Tabelle |
| [0004](0004-je-bundesland-ein-rechenmodell.md) | Je Bundesland ein Rechenmodell | Bayern, BW, NRW rechnen verschieden |
| [0005](0005-reine-funktionen-und-tests.md) | Reine Funktionen, handgerechnete Tests | Zahlen sind nachprüfbar |
| [0006](0006-versioniertes-regelwerk.md) | Versionierte Gesetzeswerte | Reformen verfälschen keine alten Auswertungen |
| [0007](0007-nur-belegtes-ansetzen.md) | Nur Belegtes ansetzen | Unsicheres heißt „vorläufig“ |
| [0008](0008-historien-statt-ueberschreiben.md) | Historien statt Überschreiben | Stichtage bleiben korrekt |
| [0009](0009-service-rolle-nur-serverseitig.md) | Service-Rolle nur serverseitig | Nur Summen verlassen den Server |
| [0010](0010-betreiber-und-marketing-getrennt.md) | Betreiber und Marketing getrennt | Kein Mitlesen von Kinder- und Personaldaten |
| [0011](0011-steuerungsinstrument-statt-datenfriedhof.md) | Steuerungsinstrument | Ampeln und Handlungen statt Zahlenfriedhof |
| [0012](0012-hosting-und-umgebungen.md) | Hosting und Umgebungen | Hostinger + Supabase, Build mit `--webpack` |
| [0013](0013-foerderung-jahresbetraege-und-ergebnis.md) | Förderung ÷ 12, Ergebnis als Planungsgröße | Was im Ergebnis steckt und was nicht |
| [0014](0014-datenschutz-als-funktion.md) | Datenschutz als Funktion | Auskunft, Löschen, Löschfristen, AVV |

## Neue Entscheidung festhalten

Neue Datei `NNNN-kurzer-titel.md` mit den Abschnitten **Frage · Entscheidung · Warum · Folgen · Fundstellen**, dann hier in die Tabelle eintragen (ein Test prüft, dass keine Datei fehlt). Wenn eine Begründung nicht bekannt ist, steht dort „nicht dokumentiert“ — nichts erfinden.
