# Rechenlogik — Kurzfassung

Die **Gesetzesdetails mit Quellen und Prüfstand** stehen in der App unter Einstellungen → Rechtsgrundlagen (`app/(app)/einstellungen/rechtsgrundlagen/page.tsx`). Hier steht, *was gerechnet wird und wo*. Alle Zahlen sind eine Planungshilfe ([0007](../entscheidungen/0007-nur-belegtes-ansetzen.md)).

## Personalbedarf (je Bundesland)

| Land | Ansatz | Code |
| --- | --- | --- |
| Bayern | gewichtete Kinderzahl ÷ Fachkraft-Vollzeitäquivalente; erlaubt 1 : 11,0 (`staffing_rules`); Gewichtung nach Art. 21 BayKiBiG (unter 3 = 2,0 · ab 3 = 1,0 · Schulkind 1,2 · nichtdeutschsprachig/Hort 1,3 · I-Kind 4,5, es gilt der höchste Faktor) | `lib/team/anstellungsschluessel.ts` |
| Baden-Württemberg | Soll-VZÄ je Gruppe aus Betriebsform, Altersmischung, Öffnungszeit und Randzeit (KiTaVO § 1); Übergangsregel § 1a bis 31.08.2027 wird nur als Hinweis gezeigt | `lib/team/personalschluessel-bw.ts` |
| NRW | Fachkraft- und Ergänzungskraftstunden je Gruppenform × Buchungszeit (Anlage zu § 33 KiBiz) | `lib/team/personalschluessel-nrw.ts` |

Die Wahl des Modells kapselt `lib/team/personalplanung.ts`. Der Basisfaktor „unter 3 / ab 3“ wird in Bayern aus Geburtsdatum, Gruppenart und Kitajahr abgeleitet (Krippenkind bleibt bis zum 31.08. nach dem 3. Geburtstag bei 2,0): `lib/kinder/basisfaktor.ts` und die Datenbankfunktion `kind_gewichtung_am_stichtag`.

## Förderung (Jahresbetrag je Kind, in der App ÷ 12)

- **Bayern:** staatlich = (Basiswert + Qualitätsbonus) × Buchungszeitfaktor × Gewichtungsfaktor. Kinder unter 3 (bis 2026): Basiswert × (Buchungszeitfaktor + 0,15) × Gewichtungsfaktor, ohne Qualitätsbonus. **Kommunaler Anteil** = Basiswert × Buchungszeitfaktor × Gewichtungsfaktor. Beitragszuschuss 100 €/Monat bis 2026 (wird an Eltern weitergegeben). Ab 2027: Reform (Qualitätsbonus 693,28 / 852,36 / 857,87 € vorläufig, Basiswert fortgeschrieben), optional Teamkräftepauschale (Schalter). Code: `lib/finanzen/foerdererloese.ts`.
- **NRW:** Kindpauschale je Gruppenform × Buchungszeit (`nrw_kindpauschalen`). Nicht enthalten: Einzelintegration, Mietzuschlag, Zuschläge nach §§ 34/35; die Pauschale wird gemeinsam von Land, Jugendamt, Träger und Eltern getragen.
- **Baden-Württemberg:** keine Landesformel; manueller Betrag je Einrichtung.
- **Überschreiben:** `foerderung_monatlich_manuell` ersetzt jede Formel. **Personalprogramme** nur bei ausdrücklichem Eintrag.

## Personalkosten

Je Mitarbeitende: manuelles Gehalt **oder** TVöD-SuE-Tabelle (Entgeltgruppe × Stufe, Stand 01.05.2026) **plus SuE-Zulage** (130 € bzw. 180 €), linear nach Wochenstunden ÷ Vollzeit-Referenz. Dazu Lohnnebenkosten (Standard 28 %) und Jahressonderzahlung (Standard 85 %, auf 12 Monate verteilt). Wer weder Gehalt noch Entgeltgruppe hat, zählt als „nicht erfasst“ — nie stillschweigend 0 €. Code: `lib/finanzen/personalkosten.ts`.

## Elternbeiträge und Ergebnis

Preisliste je Buchungszeit-Band, optional nach Krippe/Kindergarten und Wohnsitz (`lib/finanzen/elternbeitraege.ts`). Ergebnis = Fördererlöse + Elternbeiträge − Personalkosten − sonstige Kosten (`lib/finanzen/ergebnis.ts`); ohne Preisliste fehlen die Elternbeiträge, und der Hinweis an der Zahl sagt das ([0013](../entscheidungen/0013-foerderung-jahresbetraege-und-ergebnis.md)).

## Ampeln

- **Belegung** (`lib/steuerung/belegung-ampel.ts`): Rot bei Überbelegung oder Auslastung unter 90 % jetzt bzw. in den nächsten 3 Monaten; Gelb bei unter 95 % in den Monaten 4–12; sonst Grün.
- **Personal** (`lib/steuerung/personal-ampel.ts`, `lib/ausblick/personal-ausblick.ts`): Rot bei Unterschreitung jetzt oder innerhalb von 3 Monaten; Gelb bei „knapp“ oder Engpass in den Monaten 4–12.
- Die Ampeln rechnen über Stützstichtage (Ereignisse wie Austritte), nicht über jeden Monat.

## Quellenstand und offene Werte

Siehe [../betrieb/risiken-und-luecken-verkauf.md](../betrieb/risiken-und-luecken-verkauf.md) und die Rechtsgrundlagen-Seite. Offen: Basiswert Bayern 2027, NRW-Pauschalen 2027/28 und 30/40-Stunden-Reihen, TVöD ab 04/2027, Prüfung gegen Primärquellen.
