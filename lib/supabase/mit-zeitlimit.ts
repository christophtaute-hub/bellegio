/** Begrenzt eine Promise auf eine Höchstdauer — vor allem für Aufrufe der Supabase-Admin-API
 * (`auth.admin.*`), die bei einer schlechten Netzwerkverbindung sonst unbegrenzt lange hängen
 * können: der zugrunde liegende `fetch` hat von sich aus kein Zeitlimit, und ohne dieses hier
 * würde eine Server Action nie zurückkehren — der Button/„Wird angelegt…“-Zustand bliebe dann
 * für die aufrufende Seite für immer hängen, egal was die Oberfläche selbst an Fehlerbehandlung
 * hat. Bei Überschreitung wird die Promise mit `ZeitlimitFehler` abgelehnt, die Verbindung selbst
 * läuft im Hintergrund weiter (kein `AbortController`, da die Supabase-Admin-API keinen entgegennimmt). */
export class ZeitlimitFehler extends Error {
  constructor() {
    super("ZEITLIMIT");
    this.name = "ZeitlimitFehler";
  }
}

export function mitZeitlimit<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ZeitlimitFehler()), ms);
    promise.then(
      (wert) => {
        clearTimeout(timer);
        resolve(wert);
      },
      (fehler) => {
        clearTimeout(timer);
        reject(fehler);
      }
    );
  });
}
