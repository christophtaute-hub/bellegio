# Funktionsübersicht

Welche Funktion gibt es, wer darf sie, wo liegt sie im Code. Rechte stammen aus dem Seitencode; die eigentliche Durchsetzung liegt in der Datenbank ([Entscheidung 0002](entscheidungen/0002-zugriff-im-zeilenschutz.md)). **Bereiche:** Kinder & Gruppen = `belegung`, Personal, Controlling, Szenario-Rechner (Planung), Finanzübersicht = `finanzen`, Einzelgehälter = `gehaelter`; Stufen *ansehen* und *bearbeiten*. Der Träger-Admin darf alles in seinem Träger.

## Menü

**Seitenleiste:** Dashboard · Gruppen · Kinder · Team · Controlling · Planung · Einstellungen (+ „Abrechnung“ nur für den System-Admin, nie für Träger-Admins). Die Seitenleiste blendet keine Punkte nach Rechten aus; ohne Recht zeigt die Seite einen Hinweis, eine 404-Seite oder nur leere Daten. **Kopfzeile:** Einrichtung (Klick: „auf einen Blick“), Bundesland, Einrichtungs-Wechsler (nur bei mehr als einer Einrichtung), Suche (Strg/Cmd+K), Nutzermenü (Einstellungen, Einrichtung wechseln, Mein Profil, System-Admin (nur der Betreiber), Abmelden).

## Anmelden und Start

| Route | Funktion | Wer | Code |
| --- | --- | --- | --- |
| `/login` | Anmelden, bei Zwei-Faktor weiter zu `/mfa` | öffentlich | `components/auth/login-form.tsx`, `lib/actions/auth.ts` |
| `/passwort-vergessen`, `/passwort-setzen` | Passwort zurücksetzen bzw. nach Einladung festlegen | öffentlich | `components/auth/` |
| `/zustimmung` | Träger-Admin bestätigt AGB und AVV (nur wenn die Rechtstexte als geprüft gelten) | Träger-Admin | `lib/server/zustimmung.ts` |
| `/einrichtung-auswahl` („Meine Einrichtungen“) | Karten je Einrichtung mit Belegungs- und Personal-Ampel, frei wählbarer Stichtag, Filter nach Bundesland; wer nur eine Einrichtung sieht, geht direkt hinein | angemeldet | `components/einrichtung/einrichtung-kachel.tsx`, `lib/steuerung/kita-ampel.ts` |
| `/einrichtung-auswahl/neu` | neue Einrichtung anlegen (Bundesland danach fest) | Träger-Admin | `lib/actions/einrichtung.ts` (`legeEinrichtungAn`) |

## Dashboard (`/dashboard`)

| Funktion | Wer | Code |
| --- | --- | --- |
| Zwei Ampeln (Belegung, Personal) mit Satz und „Was tun?“ | alle | `lib/steuerung/*`, `components/steuerung/` |
| Handlungsliste mit Sprung zum Datensatz | alle | `lib/steuerung/handlungen.ts` |
| Gruppen-Ampel (Belegung + Personal je Gruppe, „Zusage möglich?“) | alle | `lib/steuerung/gruppen-status.ts`, `zusage.ts` |
| Plus/Minus-Karte (Förderung − Personal) | Recht Finanzübersicht | `components/dashboard/cockpit.tsx` |
| „Verlauf & Details“ (`?ansicht=verlauf`): Ringe, Diagramme Kinder und Personal, Monatsdetails, Zeitraum 3–24 Monate | alle | `lib/steuerung/cockpit.ts` |
| Maßnahmen zu einer Ampel festhalten (Vorschläge, Notiz, Zielmonat, Verlauf) | Belegung bzw. Personal bearbeiten | `components/steuerung/ampel-zeile.tsx`, `lib/actions/massnahmen.ts` |
| Stichtag-Wahl („Anderer Zeitpunkt“) | alle | `components/shared/stichtag-picker.tsx` |

## Gruppen

| Route | Funktion | Wer | Code |
| --- | --- | --- | --- |
| `/gruppen` | Gruppenliste | alle | `app/(app)/gruppen/page.tsx` |
| `/gruppen/neu`, `/gruppen/[id]/bearbeiten` | anlegen, ändern, archivieren (BW: Betriebsform, Öffnungs- und Randzeit; NRW: Gruppenform, Buchungszeit) | Kinder & Gruppen bearbeiten | `components/gruppen/gruppe-form.tsx`, `lib/actions/gruppen.ts` |
| `/gruppen/[id]` | Sitzplätze 1…Sollplätze nach Alter, freie Plätze, Nachrücker auf dem Platz des ersetzten Kindes, Personal der Gruppe, Hinweise | alle | `lib/gruppen/sitzplaetze.ts`, `components/gruppen/` |
| `/gruppen/vorschau` | Belegungs-Vorschau über mehrere Monate mit Nachrücker-Vorschlägen | Kinder & Gruppen mindestens ansehen | `lib/belegung/vorschau.ts` |

## Kinder

| Route | Funktion | Wer | Code |
| --- | --- | --- | --- |
| `/kinder` | Liste mit Suche, Sortierung, Filter, Alter, Excel-Export | alle | `lib/suche/suchbegriff.ts`, `components/kinder/kinder-export-buttons.tsx` |
| `/kinder/neu`, `/kinder/[id]` | anlegen und ändern: Buchungszeit „gültig ab“ (mit Verlauf), Gewichtungsfaktoren, I-Status mit Zeitraum, Nachrücker (Eintritt Pflicht, optional „ersetzt Kind“), Austritt Pflicht (Vorschlag), Wohnort | Kinder & Gruppen bearbeiten | `components/kinder/kind-form.tsx`, `lib/actions/kinder.ts` |
| Notizen-Verlauf | datierte Notizen, nichts wird überschrieben | bearbeiten | `components/kinder/notizen-verlauf.tsx` |
| Gruppenwechsel (z. B. Krippe → Kindergarten) planen oder zurücknehmen | bearbeiten | `components/kinder/wechsel-karte.tsx`, `lib/belegung/wechsel-vorschlaege.ts` |
| Änderungsverlauf, Druckansicht | bearbeiten | `components/kinder/aenderungshistorie.tsx` |
| `/kinder/[id]/auskunft` | Auskunft nach Art. 15 DSGVO | bearbeiten | `lib/datenschutz/auskunft.ts` |
| Anonymisieren / Löschen (nur ausgetretene, Nachrücker, Geplante) | Träger-Admin | `lib/actions/datenschutz.ts` |
| `/kinder/import` | Excel/CSV-Import mit Prüfung, Fehlerliste und Abgleich bestehender Kinder | bearbeiten | `components/import/import-assistent.tsx`, `lib/import/` |

## Team

| Route | Funktion | Wer | Code |
| --- | --- | --- | --- |
| `/team` | Teamliste mit Personalplanung des Bundeslands, Gruppen-Schnellauswahl, Tarif-Spalte | alle; Tarif nur mit Einzelgehälter | `components/team/personalplanung-*.tsx` |
| `/team/neu`, `/team/[id]` | anlegen, ändern, Ausfallzeiten, Vergütung (Entgeltgruppe/Stufe oder manuelles Gehalt) | Personal bearbeiten; Vergütung nur mit Einzelgehälter | `components/team/team-form.tsx`, `lib/actions/team.ts`, `team-verguetung.ts` |
| `/team/jahresuebersicht` | Stunden je Person und Monat bearbeiten, Eintritte, Austritte, Ausfälle | Personal (bearbeiten für Änderungen) | `lib/team/jahresuebersicht.ts` |
| `/team/[id]/auskunft`, Anonymisieren/Löschen, `/team/import` | wie bei Kindern | Personal bearbeiten bzw. Träger-Admin | |

## Controlling

| Route | Funktion | Wer | Code |
| --- | --- | --- | --- |
| `/controlling` | Monatsreihe: Kinder, Plätze, Personal-Ampel, Schlüssel; mit Finanzrecht Förderung, Elternbeiträge, Personalkosten, Ergebnis; Ansicht „Übersicht“ oder „Alle Kennzahlen“; Zeitraum Kitajahr, Kalenderjahr oder mehrere Jahre; Kinder nach Buchungszeit inkl. I-Status; Excel-Export; Rechtsstand-Hinweise | Controlling ansehen; Finanzzeilen mit Finanzübersicht | `lib/forecast/monthly-forecast.ts`, `components/forecast/` |
| `/controlling/mappe` | Prüfungsmappe zum Drucken (PDF über den Browser) und als Excel | wie oben | `components/controlling/mappe-export-buttons.tsx` |

## Planung (`/szenario`)

| Funktion | Wer | Code |
| --- | --- | --- |
| **Kitajahr planen:** Vorschlag aus Ein- und Austritten, geplante Kinder und Einstellungen eintragen, „Jetzt berechnen“; Plan speichern | Szenario ansehen, Speichern mit bearbeiten; Geld nur mit Finanzübersicht | `lib/planung/`, `components/szenario/kitajahr-planung.tsx` |
| **Was wäre wenn:** Gruppen und Personal verändern, Ergebnis berechnen (je Bundesland eigener Rechner; Gehalt je Zeile) | wie oben | `components/szenario/szenario-rechner*.tsx` |

## Einstellungen (Reiter)

| Reiter (Route) | Funktion | Wer |
| --- | --- | --- |
| Einrichtung (`/einstellungen`) | Grunddaten, „auf einen Blick“, Vollzeit-Wochenstunden, empfohlener Schlüssel | alle sehen, Träger-Admin ändert |
| Finanzen (`/einstellungen/finanzen`) | Förderbetrag manuell, Personalprogramme, sonstige Kosten, Teamkräftepauschale (Bayern), Lohnnebenkosten, Jahressonderzahlung, Elternbeitrags-Preisliste (nach Krippe/Kindergarten und Wohnsitz, Geschwister, Zuschuss) | Finanzübersicht (ansehen/bearbeiten) |
| Nutzer & Rechte (`/einstellungen/nutzer`) | Nutzer anlegen (Einladung oder Passwort), sperren, löschen; Rechte-Schalter je Einrichtung und Bereich, „Für ganzes Cluster setzen“, lokale Admins, Marketing-Recht | Träger-Admin; Rechteverwalter und lokale Admins für ihre Einrichtungen |
| Einrichtungen (`/einstellungen/einrichtungen`) | Kostenstelle, Cluster, Archivieren, „Neue Einrichtung“ | Träger-Admin, System-Admin |
| Datenschutz (`/einstellungen/datenschutz`) | Löschfristen, Löschkandidaten | Träger-Admin |
| Rechtsgrundlagen (`/einstellungen/rechtsgrundlagen`) | Berechnungen, Gesetze, Quellen, Prüfstand | alle |
| Hilfe (`/einstellungen/hilfe`, Kapitel unter `/einstellungen/hilfe/[id]`) | Handbuch für Laien aus `docs/handbuch/`, Glossar, häufige Fragen; Kontextlinks „Wie funktioniert das?“ an Dashboard, Controlling, Planung, Nutzer & Rechte | alle |
| Mein Profil (`/einstellungen/profil`) | Name, Passwort, Zwei-Faktor (TOTP); für Demo-Konten ausgeblendet | alle |

## Suche und Hilfsfunktionen

- **Globale Suche** (Strg/Cmd+K): Einrichtungen, Kinder, Mitarbeitende, App-Funktionen; Kinder nur mit Recht „Kinder & Gruppen“, Personal nur mit Recht „Personal“. `lib/actions/suche.ts`, `lib/suche/funktionen.ts`.
- **Einrichtungs-Wechsler** mit Bundesland-Gruppen. `components/layout/einrichtung-switcher.tsx`.
- **Exporte:** Excel (`xlsx`) in Controlling, Prüfungsmappe, Kinderliste; „Als PDF speichern“ über den Browser-Druck.

## Marketing-Ampel (`/marketing`, Recht Marketing)

Übersicht aller Einrichtungen des Trägers mit vier Ampeln und Hinweisen, Filter; Einrichtungsansicht mit Bewertung (von Hand, mit Vorschlag aus Bellegio-Daten), Kampagnen (Dialog, Liste, Budget, Status), Verlauf; „Kriterien & Fristen“ (nur bearbeiten). Code: `lib/marketing/`, `lib/actions/marketing-*.ts`. Marketing sieht keine Kinder- oder Personaldaten ([0010](entscheidungen/0010-betreiber-und-marketing-getrennt.md)).

## System-Admin (`/admin`, nur der Betreiber des Dienstes, ggf. mit Zwei-Faktor)

Abrechnung mit Umsatzkennzahlen, Einnahmen (Diagramm, Export), Rechnungen (Entwurf, freigeben, bezahlt, stornieren), Kunden und Preise (Staffel je Einrichtung), Kunden anlegen (Träger, erste Einrichtung, Träger-Administration), Demo-Anfragen, Betreiberdaten und Freigabe der Rechtstexte. Code: `lib/admin/`, `lib/actions/admin.ts`.

## Öffentliche Seiten

Landingpage mit Preisrechner und Demo-Anfrage; `impressum`, `datenschutz`, `agb`, `avv`, `tom`, `unterauftragnehmer` (Entwürfe, nicht anwaltlich geprüft).
