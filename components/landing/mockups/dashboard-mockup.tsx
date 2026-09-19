import { Users, DoorOpen, Wallet, Scale } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { BrowserFrame } from "@/components/landing/browser-frame";

const BALKEN = [
  { label: "4-5h", hoehe: 28 },
  { label: "5-6h", hoehe: 44 },
  { label: "6-7h", hoehe: 88 },
  { label: "7-8h", hoehe: 66 },
  { label: "8-9h", hoehe: 50 },
];

export function DashboardMockup() {
  return (
    <BrowserFrame titel="Testkita Bayern · Dashboard">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-xl font-semibold tracking-tight text-primary">Aloha, Sabine</p>
            <p className="text-xs text-muted-foreground">Eure Belegung und Personalsituation auf einen Blick.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Anstellungsschlüssel erfüllt
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <MetricCard label="Kinder am Stichtag" value="16" icon={<Users />} trend={[14, 15, 15, 16]} />
          <MetricCard label="Freie Plätze" value="10 / 26" icon={<DoorOpen />} />
          <MetricCard label="Gewichtete Buchungsstunden" value="44,98" icon={<Wallet />} trend={[40, 42, 44, 45]} />
          <MetricCard label="Anstellungsschlüssel" value="1 : 9,28" icon={<Scale />} trend={[9.4, 9.3, 9.3, 9.28]} />
        </div>
        <div className="rounded-xl bg-secondary/40 p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Verteilung nach Buchungszeit</p>
          <div className="flex h-24 items-end gap-2">
            {BALKEN.map((b) => (
              <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${b.hoehe}%` }} />
                <span className="text-[10px] text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
