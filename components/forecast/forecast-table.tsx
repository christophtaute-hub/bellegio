import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
                className="text-right font-semibold tabular-nums"
              >
                {m.belegung.differenz >= 0 ? "+" : ""}
                {m.belegung.differenz}
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Buchungen gew.
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.buchungenGew)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Soll-FK
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.sollFk)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-FK
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istFk)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-EK
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istEk)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-AZ gesamt
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istAzGesamt)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-AZ pro Gruppe
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(m.personal.istAzProTagGesamt)}
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
                className="text-right font-semibold tabular-nums"
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
              Empfohlener Schlüssel 1:10
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
