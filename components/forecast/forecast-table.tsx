import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { parseIsoDate } from "@/lib/kita-datum";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function formatMonthLabel(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function JaNeinBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "secondary" : "destructive"}>
      {ok ? "Ja" : "Nein"}
    </Badge>
  );
}

export function ForecastTable({ months }: { months: ForecastMonth[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">
              Kennzahl
            </TableHead>
            {months.map((m) => (
              <TableHead key={m.month} className="text-right whitespace-nowrap">
                {formatMonthLabel(m.month)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Belegte Plätze ohne I-Kind
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.belegteOhneI}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Belegte Plätze mit I-Kind
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.belegteMitI}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Plätze nach Betriebserlaubnis
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.plaetzeNachBetriebserlaubnis}
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-secondary/40">
            <TableCell className="sticky left-0 z-10 bg-secondary/40 font-semibold">
              Differenz (+/-)
            </TableCell>
            {months.map((m) => (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  m.belegung.differenz >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {m.belegung.differenz >= 0 ? "+" : ""}
                {m.belegung.differenz}
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Gewichtete Kinderzahl
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.gewichteteKinderzahl)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-VZÄ / Soll-VZÄ
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.vzaeIst, 2)} / {formatNumber(m.personal.vzaeSoll, 2)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-FK-VZÄ / Soll-FK-VZÄ
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istFk / (m.personal.vollzeitWochenstunden || 1), 2)}{" "}
                / {formatNumber(m.personal.vzaeSollFachkraft, 2)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-AZ gesamt (FK+EK)
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istAzGesamt)} Std.
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-secondary/40">
            <TableCell className="sticky left-0 z-10 bg-secondary/40 font-semibold">
              Anstellungsschlüssel
            </TableCell>
            {months.map((m) => (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  m.personal.mindestschluesselOk
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {m.personal.anstellungsschluessel !== null
                  ? `1 : ${formatNumber(m.personal.anstellungsschluessel, 2)}`
                  : "–"}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Mindestschlüssel 1:11,0
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={m.personal.mindestschluesselOk} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Eigene Zielgröße (nicht gesetzlich)
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={m.personal.empfohlenerSchluesselOk} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Qualifikationsschlüssel
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={m.personal.qualifikationsschluesselOk} />
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
