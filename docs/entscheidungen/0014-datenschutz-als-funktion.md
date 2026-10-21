# 0014 — Datenschutz als Funktion der App

**Frage:** Wie gehen wir mit Kinder- und Gesundheitsdaten um (I-Status ist ein Gesundheitsmerkmal nach Art. 9 DSGVO)?

**Entscheidung:** Datenschutz ist eingebaut: Auskunft zu einem Kind oder Mitarbeitenden (Art. 15) als Seite, endgültiges Löschen bzw. Anonymisieren für archivierte Datensätze (nur Träger-Admin, mit Bestätigung), einstellbare Löschfristen, Änderungsprotokolle, Zustimmung des Träger-Admins zu AGB und AVV beim Login. Rechtstexte (Impressum, Datenschutz, AGB, AVV, TOM, Unterauftragnehmer) sind als Seiten hinterlegt.

**Warum:** Die Daten sind sensibel, und Träger brauchen für den Einsatz Auftragsverarbeitungsvertrag, Auskunft und Löschkonzept.

**Folgen:** Die Rechtstexte sind Entwürfe und **nicht anwaltlich geprüft**; bis zur Prüfung zeigt die App einen Entwurfshinweis. Offene Punkte (Verarbeitungsverzeichnis, Folgenabschätzung) stehen in `docs/betrieb/`.

**Fundstellen:** `app/(app)/einstellungen/datenschutz/`, `lib/datenschutz/`, `app/agb/`, `app/avv/`, `app/tom/`, `docs/betrieb/anwalt-und-steuerberater.md`.
