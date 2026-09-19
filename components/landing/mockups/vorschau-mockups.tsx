import { BrowserFrame } from "@/components/landing/browser-frame";
import { cn } from "cn";

/** Schlüssel-Radar (Dashboard). */
export function RadarMockup() {
  return (
    <BrowserFrame titel="Dashboard · Schlüssel-Radar">
      <div className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold text-primary">Schlüssel-Radar</p>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm">
          <p className="font-medium text-destructive">Erster Engpass: April 2027 — es fehlen rund 10 Wochenstunden</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ursache: Austritt von Julia V. (30,0 Wochenstunden). Es genügt, rund 10 Wochenstunden zu ergänzen — oder die
            wegfallenden Stunden zu ersetzen.
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} className={cn("h-6 flex-1 rounded", i < 7 || i >= 12 ? "bg-emerald-300" : "bg-red-300")} />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Die nächsten 18 Monate auf einen Blick — je Bundesland mit dem eigenen Rechenweg.</p>
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
