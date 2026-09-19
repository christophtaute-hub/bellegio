import { AmpelBadge } from "@/components/team/ampel-badge";
import { Badge } from "@/components/ui/badge";
import { BrowserFrame } from "@/components/landing/browser-frame";

const TEAM = [
  { name: "Sarah L.", rolle: "Fachkraft", std: "25,0", gruppe: "Kindergarten" },
  { name: "Tobias S.", rolle: "Fachkraft", std: "35,0", gruppe: "Kindergarten" },
  { name: "Max B.", rolle: "Fachkraft", std: "18,0", gruppe: "Krippe" },
  { name: "Julia V.", rolle: "Fachkraft", std: "30,0", gruppe: "Krippe", austritt: "Austritt 31.03.2027" },
];

// Anstellungsschlüssel je Monat (Beispiel): grün bis März 2027, ab April über 11,0.
const MONATE = [
  { m: "Jan", wert: 9.3, ok: true },
  { m: "Feb", wert: 9.3, ok: true },
  { m: "Mär", wert: 9.3, ok: true },
  { m: "Apr", wert: 12.9, ok: false },
  { m: "Mai", wert: 12.9, ok: false },
  { m: "Jun", wert: 12.9, ok: false },
];

export function TeamMockup() {
  return (
    <BrowserFrame titel="Team · Personalplanung">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-heading text-lg font-semibold text-primary">Personal &amp; Anstellungsschlüssel</p>
          <AmpelBadge ampel="gruen" />
        </div>
        <ul className="flex flex-col divide-y rounded-xl border text-sm">
          {TEAM.map((p) => (
            <li key={p.name} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="w-24 font-medium">{p.name}</span>
              <Badge variant="secondary">{p.rolle}</Badge>
              <span className="text-xs text-muted-foreground">{p.gruppe}</span>
              {p.austritt ? <span className="text-xs font-medium text-destructive">{p.austritt}</span> : null}
              <span className="ml-auto tabular-nums">{p.std} Std.</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-secondary/40 p-3.5">
          <p className="mb-2.5 text-xs font-medium text-muted-foreground">Anstellungsschlüssel im Zeitverlauf (Bayern, Mindestschlüssel 1 : 11,0)</p>
          <div className="grid grid-cols-6 gap-2">
            {MONATE.map((x) => (
              <div key={x.m} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-14 w-full items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${
                    x.ok ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  1:{x.wert.toLocaleString("de-DE", { minimumFractionDigits: 1 })}
                </div>
                <span className="text-[10px] text-muted-foreground">{x.m} 27</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
