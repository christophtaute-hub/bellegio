import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GESCHLECHT_LABEL } from "@/lib/constants";
import {
  austrittWarnung,
  calculateAgeDecimal,
  formatDate,
} from "@/lib/kita-datum";
import { cn } from "cn";

export type KinderTableRow = {
  id: string;
  platznummer: string | null;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  eintritt: string | null;
  austritt: string | null;
  notizen: string | null;
  status: string;
  booking_time_bands: { label: string } | null;
  weighting_factor_label?: string | null;
};

export function KinderTable({
  rows,
  kitaYearStartMonth,
  highlightAustritt = false,
  emptyMessage,
}: {
  rows: KinderTableRow[];
  kitaYearStartMonth: number;
  highlightAustritt?: boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platz</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Geschlecht</TableHead>
            <TableHead>Geburtstag</TableHead>
            <TableHead>Alter</TableHead>
            <TableHead>Eintritt</TableHead>
            <TableHead>Austritt</TableHead>
            <TableHead>Buchungszeit</TableHead>
            <TableHead>Gewichtungsfaktor</TableHead>
            <TableHead>Notizen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((kind) => {
            const warnung = highlightAustritt
              ? austrittWarnung(kind.austritt, kitaYearStartMonth)
              : null;
            return (
              <TableRow
                key={kind.id}
                className={cn(
                  warnung === "rot" && "bg-destructive text-destructive-foreground"
                )}
              >
                <TableCell
                  className={cn(
                    warnung !== "rot" && "text-muted-foreground"
                  )}
                >
                  {kind.platznummer ?? "–"}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/kinder/${kind.id}`}
                    className="hover:underline"
                  >
                    {kind.vorname} {kind.nachname}
                  </Link>
                </TableCell>
                <TableCell
                  className={cn(warnung !== "rot" && "text-muted-foreground")}
                >
                  {GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht}
                </TableCell>
                <TableCell>{formatDate(kind.geburtsdatum)}</TableCell>
                <TableCell>{calculateAgeDecimal(kind.geburtsdatum)} Jahre</TableCell>
                <TableCell>{formatDate(kind.eintritt)}</TableCell>
                <TableCell
                  className={cn(
                    warnung === "hellrot" && "font-medium text-destructive"
                  )}
                >
                  {formatDate(kind.austritt)}
                </TableCell>
                <TableCell>{kind.booking_time_bands?.label ?? "–"}</TableCell>
                <TableCell
                  className={cn(warnung !== "rot" && "text-muted-foreground")}
                >
                  {kind.weighting_factor_label ?? "Regelfaktor"}
                </TableCell>
                <TableCell
                  className={cn(
                    "max-w-48 truncate",
                    warnung !== "rot" && "text-muted-foreground"
                  )}
                >
                  {kind.notizen ?? ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
