import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompositionMatrix } from "@/lib/dashboard/presence";

function formatFactor(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function CompositionTable({ matrix }: { matrix: CompositionMatrix }) {
  if (matrix.grandTotal === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Kinder am gewählten Stichtag anwesend.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gewichtungsfaktor</TableHead>
            {matrix.buchungszeitLabels.map((label) => (
              <TableHead key={label} className="text-right">
                {label}
              </TableHead>
            ))}
            <TableHead className="text-right font-semibold">Summe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.rows.map((row) => (
            <TableRow key={row.weightingLabel}>
              <TableCell className="font-medium">
                {row.weightingLabel}{" "}
                <span className="text-muted-foreground">
                  ({formatFactor(row.weightingFactor)})
                </span>
              </TableCell>
              {matrix.buchungszeitLabels.map((label) => (
                <TableCell key={label} className="text-right tabular-nums">
                  {row.cells[label] > 0 ? row.cells[label] : "–"}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">
                {row.total}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-secondary/40">
            <TableCell className="font-semibold">Summe</TableCell>
            {matrix.buchungszeitLabels.map((label) => (
              <TableCell
                key={label}
                className="text-right font-semibold tabular-nums"
              >
                {matrix.columnTotals[label]}
              </TableCell>
            ))}
            <TableCell className="text-right font-semibold tabular-nums">
              {matrix.grandTotal}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
