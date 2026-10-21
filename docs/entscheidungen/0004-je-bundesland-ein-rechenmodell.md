# 0004 — Je Bundesland ein eigenes Rechenmodell

**Frage:** Gibt es eine gemeinsame Formel für den Personalbedarf, oder rechnet jedes Land anders?

**Entscheidung:** Jedes unterstützte Bundesland hat sein eigenes Modell, die App wählt es über das Bundesland der Einrichtung: **Bayern** gewichtete Kinderzahl und Anstellungsschlüssel (1 : 11), **Baden-Württemberg** Stellen je Betriebsform und Öffnungszeit (inkl. Randzeit), **NRW** Personalstunden je Gruppenform und Buchungszeit. Das Bundesland einer Einrichtung ist nach dem Anlegen fest.

**Warum:** Die Landesgesetze unterscheiden sich im Ansatz, nicht nur in den Zahlen. Eine Einheitsformel wäre überall ein bisschen falsch.

**Folgen:**
- Gemeinsame Schnittstelle nach außen (Ampel, Personal-Ausblick, Forecast), dahinter je Land eine Berechnung. Neue Länder brauchen ein eigenes Modell, nicht nur neue Zahlen.
- Förderung: Bayern und NRW als Formel, Baden-Württemberg nur als manueller Betrag (es gibt keine Landesformel).

**Fundstellen:** `lib/team/anstellungsschluessel.ts`, `lib/team/personalschluessel-bw.ts`, `lib/team/personalschluessel-nrw.ts`, `lib/team/personalplanung.ts`; Gesetzesdetails in der App unter Einstellungen → Rechtsgrundlagen.
