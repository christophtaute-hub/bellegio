"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompositionMatrix } from "@/lib/dashboard/presence";

/** BW/NRW kennen keinen Gewichtungsfaktor pro Kind (anders als Bayern) —
 * hier reicht eine reine Buchungszeit-Verteilung, ohne die für diese
 * Bundesländer bedeutungslose "Gewichtungsfaktor"-Dimension. */
export function BuchungszeitVerteilung({ matrix }: { matrix: CompositionMatrix }) {
  if (matrix.grandTotal === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Kinder am gewählten Stichtag anwesend.
      </p>
    );
  }

  const daten = matrix.buchungszeitLabels.map((label) => ({
    buchungszeit: label,
    anzahl: matrix.columnTotals[label] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="h-56 w-full">
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
            <Bar dataKey="anzahl" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buchungszeit</TableHead>
              <TableHead className="text-right">Kinder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.buchungszeitLabels.map((label) => (
              <TableRow key={label}>
                <TableCell className="font-medium">{label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {matrix.columnTotals[label]}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-secondary/40">
              <TableCell className="font-semibold">Summe</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {matrix.grandTotal}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
