# Bellegio auf einer Seite

**Bellegio ist ein Steuerungsinstrument für Kitas.** Es beantwortet drei Fragen: *Wo läuft es? Warum? Was muss ich jetzt tun?* — für Belegung, Personal und Geld, getrennt nach dem Landesrecht der Einrichtung.

## Für wen

- **Einrichtungsleitung und Verwaltung** — Kinder, Gruppen, Personal, Ampeln, Planung.
- **Träger-Administration** — mehrere Einrichtungen, Nutzer und Rechte, Datenschutz.
- **Marketing** (optional) — Ampeln über alle Einrichtungen des Trägers und Kampagnen.
- **System-Admin** (Bellegio selbst, Betreiber des Dienstes) — Kunden anlegen, Rechnungen, Einnahmen. Das ist die einzige Rolle, die Abrechnung sieht; auch Träger-Administratoren nicht.

## Was die App kann

| Bereich | Kernaussage |
| --- | --- |
| Dashboard | Zwei Ampeln je Einrichtung (Belegung, Personal), Handlungsliste, Gruppen-Ampel, Verlauf auf Klick |
| Gruppen und Kinder | Aufnahme, Buchungszeit mit Verlauf, Nachrücker, Wechsel Krippe → Kindergarten, Notizen, Import aus Excel |
| Team | Personal, Stunden je Monat, Ausfälle, Vergütung (nur mit Recht), Import |
| Controlling | Monatsreihe für Kinder, Personal und Geld, Kategorisierung nach Buchungszeit, Prüfungsmappe, Export |
| Planung | Kitajahr durchrechnen („Jetzt berechnen“) und „Was wäre wenn“ |
| Einstellungen | Einrichtung, Finanzen, Nutzer und Rechte, Datenschutz, Rechtsgrundlagen, Profil |
| Marketing-Ampel | Vier Ampeln je Einrichtung, Kampagnen mit Budget und Status |
| System-Admin (`/admin`) | Kunden, Rechnungen, Einnahmen — nur für den System-Admin |

## Drei Bundesländer, drei Rechenwege

Bayern, Baden-Württemberg und Nordrhein-Westfalen rechnen den Personalbedarf **verschieden** — die App wählt den Weg nach dem Bundesland der Einrichtung (siehe [Entscheidung 0004](entscheidungen/0004-je-bundesland-ein-rechenmodell.md)). Die Gesetzeswerte mit Quelle stehen in der App unter Einstellungen → Rechtsgrundlagen.

## Was die App nicht ist

- **Keine Rechts- oder Behördenauskunft.** Alle Zahlen sind eine **Planungshilfe**. Der Zuwendungsbescheid und die amtliche Meldung gelten.
- Das **Ergebnis** im Controlling ist Förderung plus Elternbeiträge minus Personalkosten minus eingetragene sonstige Kosten — kein Jahresabschluss (siehe [Entscheidung 0013](entscheidungen/0013-foerderung-jahresbetraege-und-ergebnis.md)).
- Kein Buchhaltungs- oder Abrechnungssystem für Eltern; keine Anbindung an KigaRoo oder rexx (Import per Excel/CSV).

## Wo geht es weiter

- Bedienung für Laien: [handbuch/](handbuch/README.md)
- Funktionen im Detail: [funktionen.md](funktionen.md)
- Aufbau und Datenmodell: [architektur/](architektur/)
- Warum es so gebaut ist: [entscheidungen/](entscheidungen/README.md)
- Betrieb, Go-live, Risiken: [betrieb/](betrieb/)
