# Zahlenabgleich mit den Demo-Kitas (Stand 2026-10-04, Stichtag 04.10.2026)

Die Zahlen der App wurden mit einer unabhängigen Nachrechnung direkt auf den Rohtabellen (SQL, ohne die App-Funktionen) verglichen.
Basis: sechs Kitas im Träger „Villa Kunterbunt“ (zwei je Bundesland), Daten aus `scripts/seed-milestone32-*.ts`. Alle Werte stimmen überein.
Die Demo-Daten sind frei erfunden; geprüft wird die **Rechenlogik**, nicht echte Förderbescheide.

| Kita | Größe | App | Nachrechnung |
| --- | --- | --- | --- |
| Kita Sonnenschein (BY) | gew. Kinder / VZÄ | Schlüssel 1 : 9,33 | 53,10 / 5,69 = 9,33 ✓ |
| Testkita Bayern (BY, Vollzeit 40 Std.) | gew. Kinder / VZÄ | 1 : 9,24 | 53,60 / 5,80 = 9,24 ✓ |
| Testkita Bayern | Fördererlöse / Personalkosten / Ergebnis | 14.770 / 37.005 / −22.235 € | 14.770 / 37.005 / −22.235 € (Nachrechnung Förderung 14.770) |
| Kita Sonnenschein | Fördererlöse / Personalkosten | 15.178 / 37.014 € | 15.178 / 37.014 € (Nachrechnung) |
| Kita Regenbogen (BW) | Ist-VZÄ / Soll-VZÄ | 6,82 / 6,26 | 6,82 / 6,26 ✓ |
| Testkita Baden-Württemberg | Ist-VZÄ / Soll-VZÄ | 8,33 / 6,16 | 8,33 / 6,16 ✓ |
| Kita Regenbogen | Personalkosten | 45.285 € | 45.285 € ✓ |
| Kita Löwenzahn (NRW) | Ist-FK / Soll-FK Std. | 237,0 / 202,5 | 237,0 / 202,5 ✓ |
| Testkita Nordrhein-Westfalen | Ist-FK / Soll-FK Std. | 202,5 / 202,5 | 202,5 / 202,5 ✓ |
| Kita Löwenzahn | Personalkosten | 48.850 € | 48.850 € ✓ |
| Kita Löwenzahn (NRW, Kindpauschalen 2026/27, ohne manuellen Betrag) | Fördererlöse / Ergebnis | 52.697 € / +3.848 € | 52.697 € / +3.848 € ✓ |
| Testkita Nordrhein-Westfalen | Fördererlöse (erwartet) | – | 44.083 € (nur Nachrechnung) |
| Kita Regenbogen | Verteilung nach Buchungszeit (52 Kinder) | 10 / 5 / 20 / 12 / 5 | 10 / 5 / 20 / 12 / 5 ✓ |

## Rechenwege (zur Nachprüfung)

- **Bayern:** Anstellungsschlüssel = Σ (höchster Gewichtungsfaktor je Kind) ÷ (Σ Wochenstunden ÷ Vollzeit). Fördererlös/Monat = Σ (Buchungszeitfaktor × Gewichtungsfaktor × (Basiswert 1.563,88 € + Qualitätsbonus 268,01 €)) ÷ 12 (Art. 21 Abs. 2, Art. 23 Abs. 1 BayKiBiG: „Basiswert plus“).
- **Baden-Württemberg:** Soll-VZÄ je Gruppe aus Referenz-VZÄ der Betriebsform; bei Hauptbetreuung/Randzeit-Split Randzeitrate = Referenz-VZÄ ÷ (2 × (Referenz-Öffnungszeit − 1) + 1), Hauptbetreuungsrate = 2 × Randzeitrate (KiTaVO §1 Abs. 2). Fördererlös ist ein manueller Betrag.
- **NRW:** Soll-FK-Stunden = Σ (Fachkraftstunden + Leitungsfreistellung) je Gruppe nach Gruppenform × Buchungszeit (`nrw_personalstunden`). Fördererlös/Monat = Σ je Kind (Kindpauschale der Gruppe nach Gruppenform × Betreuungsumfang, KGJ 2026/27) ÷ 12; Pauschalen siehe Migration `20261004100000_nrw_kindpauschalen_2026_27`.
- **Personalkosten (alle):** Σ (Monatsgehalt nach TVöD SuE bzw. manuell × Wochenstunden ÷ Vollzeit) × (1 + Lohnnebenkosten % + Jahressonderzahlung % ÷ 12).
- **Ausfallzeiten** zählen nur, wenn sie den **ganzen** Monat abdecken (so rechnet `team_presence_for_month`).

## Bekannte Grenzen (nicht durch den Abgleich abgedeckt)

- Bayern: Jahresbetrag je Kind und Qualitätsbonus als Teil des Basiswerts sind aus Art. 21/23 BayKiBiG belegt. Nicht abgebildet: Eigenanteil der Gemeinde (Art. 22), Erhöhung der Buchungszeitfaktoren nach § 24 AVBayKiBiG, Reform 01.01.2027. Vor echten Kunden gegen einen Förderbescheid prüfen.

*Stand der Bayern-Förderzahlen: nach der Korrektur vom 04.10.2026 (Qualitätsbonus multipliziert statt pauschal); die Nachrechnung gilt für die geänderte Formel, der App-Wert wird bei der Landingpage-Aufnahme gegengeprüft.*
- NRW-Kindpauschalen (alle Gruppenformen, KGJ 2026/27) stammen aus einer kommunalen Beschlussvorlage (Stadt Ratingen, 10/2026), nicht aus KiBiz.web. Die Pauschale ist die Summe der anerkennungsfähigen Kosten (Land, Jugendamt, Träger, Eltern) — der Träger erhält nicht den vollen Betrag. Einzelintegration, Mietzuschlag und §§34/35-Zuschläge fehlen.
- TVöD-Tabelle (S3–S18) nicht gegen die Primärquelle (VKA/dbb) geprüft.
- Ergebnis = Fördererlöse − Personalkosten; Elternbeiträge, kommunaler Anteil und Sachkosten fehlen.
- Einschulungsstatus (Muss/Kann/Korridor) in den Demo-Daten nach vereinfachten Stichtagsregeln vergeben.
