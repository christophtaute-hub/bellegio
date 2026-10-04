"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UebersichtPunkt } from "@/lib/dashboard/uebersicht";

const euro = (wert: unknown) => Number(wert).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const zahl = (wert: unknown) => Number(wert).toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Flächendiagramm der Dashboard-Übersicht (zwei Reihen, wie Einnahmen/Ausgaben bei Lexware). */
export function UebersichtChart({
  punkte,
  ersteName,
  zweiteName,
  alsEuro,
}: {
  punkte: UebersichtPunkt[];
  ersteName: string;
  zweiteName: string;
  alsEuro: boolean;
}) {
  const format = alsEuro ? euro : zahl;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={punkte} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={alsEuro ? 56 : 36}
            tickFormatter={(v) => (alsEuro ? Number(v).toLocaleString("de-DE", { notation: "compact" }) : String(v))}
          />
          <Tooltip
            formatter={(wert) => format(wert)}
            contentStyle={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="erste" name={ersteName} stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} isAnimationActive={false} />
          <Area type="monotone" dataKey="zweite" name={zweiteName} stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.12} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
