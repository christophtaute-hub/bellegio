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
import type { CompositionMatrix } from "@/lib/dashboard/presence";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CompositionChart({ matrix }: { matrix: CompositionMatrix }) {
  if (matrix.grandTotal === 0) return null;

  const daten = matrix.buchungszeitLabels.map((label) => {
    const eintrag: Record<string, string | number> = { buchungszeit: label };
    for (const row of matrix.rows) {
      eintrag[row.weightingLabel] = row.cells[label] ?? 0;
    }
    return eintrag;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daten} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="buchungszeit" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {matrix.rows.map((row, i) => (
            <Bar
              key={row.weightingLabel}
              dataKey={row.weightingLabel}
              stackId="belegung"
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={i === matrix.rows.length - 1 ? [4, 4, 0, 0] : undefined}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
