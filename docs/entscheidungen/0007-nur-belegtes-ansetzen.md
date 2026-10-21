# 0007 — Nur Belegtes ansetzen, Unsicheres als „vorläufig“ kennzeichnen

**Frage:** Was tun, wenn ein Gesetzeswert noch nicht veröffentlicht oder nicht belegt ist?

**Entscheidung:** Wir erfinden nichts. Belegte Werte werden mit Quelle hinterlegt. Unsichere oder künftige Werte erscheinen als „vorläufig“ mit Hinweis (z. B. Bayern 2027: Qualitätsbonus vorläufig, Basiswert fortgeschrieben, Teamkräftepauschale nur per Schalter). Lücken (NRW-Kindpauschalen für Gruppenform II/III in der ersten Fassung, 30/40-Stunden-Reihen) bleiben als Lücke stehen und stehen so in der Dokumentation.

**Warum:** Wer auf ein falsch „sicheres“ Ergebnis baut, trifft eine falsche Entscheidung. Ein ehrlicher Hinweis ist besser als eine scheinbar genaue Zahl.

**Folgen:**
- Hinweise zum Rechtsstand erscheinen in Controlling und Prüfungsmappe für betroffene Monate.
- Die Rechtsgrundlagen-Seite nennt je Wert die Quelle und den Prüfstand („nicht gegen Primärquelle geprüft“).
- Das Ergebnis im Controlling ist eine Planungsgröße (Förderung + Elternbeiträge − Personal − sonstige Kosten), kein Jahresabschluss.

**Fundstellen:** `lib/regelwerk/rechtsstand.ts`, `components/forecast/rechtsstand-hinweise.tsx`, `app/(app)/einstellungen/rechtsgrundlagen/page.tsx`, `lib/finanzen/hinweise.ts`.
