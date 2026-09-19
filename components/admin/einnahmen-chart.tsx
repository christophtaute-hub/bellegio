"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type EinnahmenChartPunkt = { label: string; bezahlt: number; offen: number; erwartet: number };

const euro = (value: unknown) =>
  Number(value).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export function EinnahmenChart({ daten }: { daten: EinnahmenChartPunkt[] }) {
  if (daten.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daten} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={64} tickFormatter={euro} />
          <Tooltip
            formatter={(value) => euro(value)}
            contentStyle={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="bezahlt" name="Bezahlt" stackId="e" fill="var(--chart-1)" isAnimationActive={false} />
          <Bar dataKey="offen" name="Offen (versendet)" stackId="e" fill="var(--chart-2)" isAnimationActive={false} />
          <Bar
            dataKey="erwartet"
            name="Erwartet (Entwurf)"
            stackId="e"
            fill="var(--chart-4)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
