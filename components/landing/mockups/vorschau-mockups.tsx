import { BrowserFrame } from "@/components/landing/browser-frame";

/** Personal-Ausblick (Dashboard): Satz in Klartext, Personal gegen Bedarf, Ereignisse. */
export function AusblickMockup() {
  return (
    <BrowserFrame titel="Dashboard · Personal-Ausblick">
      <div className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold text-primary">Personal-Ausblick</p>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm">
          <p className="font-medium text-destructive">Ab April 2027 fehlen dir rund 10 Wochenstunden Personal.</p>
          <p className="mt-1 text-xs text-muted-foreground">Julia V. scheidet aus (30 Wochenstunden weniger).</p>
        </div>
        <svg viewBox="0 0 300 96" className="h-28 w-full" role="img" aria-label="Beispiel: Personal fällt im April unter den Bedarf">
          <line x1="0" y1="24" x2="300" y2="24" className="stroke-border" strokeDasharray="3 3" />
          <line x1="0" y1="60" x2="300" y2="60" className="stroke-border" strokeDasharray="3 3" />
          <path d="M0 40 H150 V64 H300 V90 H0 Z" className="fill-primary/15" />
          <path d="M150 40 H300 V64 H150 Z" className="fill-red-400/50" />
          <path d="M0 40 H150 V64 H300" className="stroke-primary" fill="none" strokeWidth="2" />
          <path d="M0 40 H300" className="stroke-foreground" fill="none" strokeWidth="1.5" strokeDasharray="5 4" />
        </svg>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Sep 26</span>
          <span>Apr 27</span>
          <span>Feb 28</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Vorhandenes Personal gegen Bedarf in Wochenstunden — je Bundesland mit dem eigenen Rechenweg. Beispieldaten.
        </p>
      </div>
    </BrowserFrame>
  );
}

/** Belegungs-Vorschau (Gruppen). */
export function BelegungMockup() {
  const monate = ["Sep", "Okt", "Nov", "Dez", "Jan", "Feb"];
  const frei = [2, 2, 3, 3, 3, 4];
  return (
    <BrowserFrame titel="Gruppen · Belegungs-Vorschau">
      <div className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold text-primary">Belegungs-Vorschau</p>
        <div className="grid grid-cols-6 gap-2">
          {monate.map((m, i) => (
            <div key={m} className="flex flex-col items-center gap-1">
              <div className="flex h-12 w-full items-center justify-center rounded-lg bg-secondary text-sm font-semibold tabular-nums text-primary">
                {frei[i]}
              </div>
              <span className="text-[10px] text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Freie Plätze je Monat — mit Vorschlag, welches Nachrücker-Kind am besten in die frei werdende Gruppe passt.
        </p>
      </div>
    </BrowserFrame>
  );
}

/** Prüfungsmappe (Controlling). */
export function MappeMockup() {
  return (
    <BrowserFrame titel="Controlling · Prüfungsmappe">
      <div className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold text-primary">Prüfungsmappe</p>
        <ul className="flex flex-col gap-1.5 text-xs">
          {["Deckblatt mit Einrichtung und Zeitraum", "Belegung je Monat", "Personalschlüssel je Monat", "Kategorisierung Januar–Dezember", "Änderungsprotokoll"].map((punkt) => (
            <li key={punkt} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="size-1.5 rounded-full bg-primary" />
              {punkt}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">Ein Klick: PDF und Excel für Aufsicht, Jugendamt und Träger.</p>
      </div>
    </BrowserFrame>
  );
}
