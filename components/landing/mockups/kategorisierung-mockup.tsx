import { BrowserFrame } from "@/components/landing/browser-frame";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun"];
const ZEILEN: { label: string; werte: number[]; istStatus?: boolean }[] = [
  { label: "20 bis unter 25 Std.", werte: [2, 2, 2, 2, 2, 2] },
  { label: "30 bis unter 35 Std.", werte: [4, 4, 4, 4, 4, 4] },
  { label: "35 bis unter 40 Std.", werte: [4, 4, 4, 4, 4, 4] },
  { label: "35 bis unter 40 Std. — I-Status", werte: [1, 1, 1, 1, 1, 1], istStatus: true },
  { label: "40 bis unter 45 Std.", werte: [2, 2, 3, 3, 3, 3] },
];

export function KategorisierungMockup() {
  return (
    <BrowserFrame titel="Controlling · Kategorisierung nach Kalenderjahr">
      <div className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold text-primary">Kinder nach Wochenstunden — Januar bis Dezember</p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-secondary/50 text-muted-foreground">
                <th className="p-2 text-left font-medium">Wochenstunden</th>
                {MONATE.map((m) => (
                  <th key={m} className={`p-2 text-right font-medium ${m === "Mär" ? "bg-accent/20 text-foreground" : ""}`}>
                    {m}
                    {m === "Mär" ? <span className="block text-[9px] font-normal">Statistik-Stichtag</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZEILEN.map((z) => (
                <tr key={z.label} className={`border-b last:border-0 ${z.istStatus ? "bg-accent/10" : ""}`}>
                  <td className={`p-2 whitespace-nowrap ${z.istStatus ? "pl-4 text-muted-foreground" : "font-medium"}`}>{z.label}</td>
                  {z.werte.map((w, i) => (
                    <td key={i} className="p-2 text-right tabular-nums">
                      {w}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Gleicher Aufbau in Bayern, Baden-Württemberg und Nordrhein-Westfalen — inklusive Zeile für Kinder mit I-Status.
        </p>
      </div>
    </BrowserFrame>
  );
}
