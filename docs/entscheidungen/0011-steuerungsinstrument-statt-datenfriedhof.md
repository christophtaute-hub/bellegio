# 0011 — Steuerungsinstrument statt Datenfriedhof

**Frage:** Zeigen wir alle Kennzahlen, die sich berechnen lassen, oder nur, was zu einer Entscheidung führt?

**Entscheidung:** Die App beantwortet drei Fragen: *Wo läuft es? Warum? Was muss ich tun?* Darum gibt es nach dem Login zwei Ampeln je Einrichtung (Belegung, Personal) mit einem Satz und einer Handlung, eine Handlungsliste mit Sprung zum Datensatz, Maßnahmen mit Verlauf und erst auf Klick „Verlauf & Details“. Regel für jede neue Funktion: **Entfernen vor Hinzufügen** — was dadurch überflüssig wird, fällt weg. Fachbegriffe stehen nur in Detailansichten; im Alltag heißt es „9,2 Kinder je Fachkraft — erlaubt sind 11“.

**Warum:** Wer nur Zahlen sammelt, trifft keine Entscheidung. Die Zielgruppe (Leitung, Verwaltung) hat wenig Zeit und soll in Sekunden erkennen, wo gehandelt werden muss.

**Folgen:** Das Menü hat sieben Punkte; Einstellungen bündelt alles Seltene als Reiter. Einheitliche Statuswörter („In Ordnung“, „Knapp“, „Zu wenig Personal“) stehen an einer Stelle.

**Fundstellen:** `app/(app)/dashboard/page.tsx`, `app/(onboarding)/einrichtung-auswahl/page.tsx`, `lib/steuerung/`, `lib/ui/status.ts`, `components/steuerung/`.
