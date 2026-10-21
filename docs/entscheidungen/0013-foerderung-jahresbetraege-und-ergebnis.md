# 0013 — Förderung als Jahresbeträge ÷ 12; Ergebnis als Planungsgröße

**Frage:** Wie wird aus Gesetzeswerten ein Monatsergebnis, und was zählt dazu?

**Entscheidung:** Förderbeträge (Bayern: Basiswert, Qualitätsbonus, Teamkräftepauschale; NRW: Kindpauschale) sind **Jahresbeträge je Kind**; die App zeigt den Monatswert (÷ 12), weil Abschläge monatlich fließen. Das Ergebnis ist bewusst nur: staatliche Förderung + kommunaler Anteil (Bayern) + Elternbeiträge laut eigener Preisliste + Beitragszuschuss bis 2026 − Personalkosten − sonstige eingetragene Kosten. Personalprogramme zählen nur, wenn sie ausdrücklich eingetragen sind. Ein manueller Förderbetrag überschreibt die Formel (Pflicht für Baden-Württemberg).

**Warum:** Die Formeln sind gesetzlich belegt (Bayern: Art. 21/22/23 BayKiBiG), die tatsächliche Zahlung einer Gemeinde oder eines Landes kann abweichen. Ein ehrlicher, begrenzter Wert ist nützlicher als eine scheinbar vollständige Bilanz.

**Folgen:**
- Verpflegung, Pflegemittel, Geschwisterermäßigung und Zusatzstunden fehlen im Ergebnis; der Hinweis steht an der Zahl.
- Löhne: TVöD-SuE-Tabelle plus SuE-Zulage oder manuelles Gehalt; Lohnnebenkosten (28 %) und Jahressonderzahlung (85 %) sind einstellbar.

**Fundstellen:** `lib/finanzen/foerdererloese.ts`, `lib/finanzen/personalkosten.ts`, `lib/finanzen/ergebnis.ts`, `lib/finanzen/elternbeitraege.ts`.
