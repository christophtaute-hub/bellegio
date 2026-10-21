# 0009 — Service-Rolle nur serverseitig, nach Rechteprüfung, nur Aggregate

**Frage:** Wie berechnen wir Dinge, für die ein Nutzer die Einzeldaten nicht lesen darf (z. B. Gehaltssumme, Marketing-Vorschläge)?

**Entscheidung:** Der Service-Schlüssel (umgeht den Zeilenschutz) wird nur auf dem Server benutzt, nie im Browser, und erst **nach** einer ausdrücklichen Rechteprüfung. Von dort verlassen nur Aggregate (Summen, Stufen, Zahlen) den Server, nie Einzelwerte.

**Warum:** Wer „Finanzübersicht“, aber keine „Einzelgehälter“ sehen darf, soll die Summe bekommen, ohne dass sich Einzelgehälter ablesen lassen. Eine Marketing-Person soll Belegungsstufen sehen, ohne Kinder zu lesen.

**Folgen:**
- Bei sehr kleinen Teams lässt sich ein Einzelgehalt aus der Summe erahnen (bekannte Grenze, im Plan vermerkt).
- Der Schlüssel liegt nur als Umgebungsvariable auf dem Server; fehlt er, schlägt das Anlegen von Nutzern fehl (so aufgefallen, siehe `server_fehler_protokoll`).

**Fundstellen:** `lib/supabase/service-role.ts`, `lib/forecast/monthly-forecast.ts` (`ladeFinanzenBasis`), `lib/server/marketing.ts`, `lib/actions/berechtigungen.ts`.
