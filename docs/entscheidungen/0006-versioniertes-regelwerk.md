# 0006 — Gesetzeswerte sind versioniert, ohne Trigger

**Frage:** Wie ändern sich Gesetzeswerte (Basiswert, Pauschalen, Tarif, Personalstunden), ohne dass vergangene Auswertungen sich rückwirkend verändern?

**Entscheidung:** Jede Regelwerk-Tabelle hat `gueltig_ab` und eine Schwestertabelle `<tabelle>_historie` mit `gueltig_ab` und `gueltig_bis`. Auswertungen lösen den Wert zum jeweiligen Stichtag auf (`lib/regelwerk/verlauf.ts`). Eine Änderung ist eine Migration, die die alten Werte in die Historie schreibt und die aktuelle Zeile aktualisiert. Es gibt bewusst **keinen Trigger**.

**Warum:** Ein Gesetz tritt an einem Datum in Kraft, das der Gesetzgeber bestimmt, nicht an dem Tag, an dem jemand die Zahl einträgt. Ein Trigger mit „heute“ wäre oft falsch. Die Zeilen-IDs der Live-Tabellen bleiben stabil, weil andere Tabellen darauf verweisen.

**Folgen:**
- Die Migration mit einer Reform wird erst am oder nach dem Inkrafttretedatum eingespielt.
- Bekannte Grenze: Die Tagesansicht der Kinderzahlen (`kinder_presence_at_date`) und der Szenario-Rechner nutzen weiter „heute“.
- Das Vorgehen steht als Runbook im Kopf von `20260924110000_bundesland_regelwerk_historie.sql`.

**Fundstellen:** `lib/regelwerk/verlauf.ts`, `supabase/migrations/20260924110000_bundesland_regelwerk_historie.sql`, `lib/regelwerk/rechtsstand.ts`.
