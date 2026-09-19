import Link from "next/link";
import { Clock, Scale, VenusAndMars } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KIND_STATUS_LABEL, GESCHLECHT_LABEL } from "@/lib/constants";
import {
  austrittWarnung,
  calculateAgeDecimal,
  formatDate,
} from "@/lib/kita-datum";
import { cn } from "cn";

const GESCHLECHT_KUERZEL: Record<string, string> = {
  maennlich: "m",
  weiblich: "w",
  divers: "d",
};

export type KinderTableRow = {
  id: string;
  platznummer: string | null;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  notizen: string | null;
  status: string;
  booking_time_bands: { label: string } | null;
  weighting_factor_label?: string | null;
};

function SpaltenIcon({
  icon: Icon,
  label,
}: {
  icon: typeof Clock;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platz</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">
                <SpaltenIcon icon={VenusAndMars} label="Geschlecht (m/w/d)" />
              </TableHead>
              <TableHead className="text-center">
                <SpaltenIcon icon={Clock} label="Buchungszeit" />
              </TableHead>
              <TableHead className="text-center">
                <SpaltenIcon icon={Scale} label="Gewichtungsfaktor" />
              </TableHead>
              <TableHead>Eintritt</TableHead>
              <TableHead>Austritt</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((kind, index) => {
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
                      "tabular-nums",
                      warnung !== "rot" && "text-muted-foreground"
                    )}
                  >
                    {kind.platznummer ?? index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={`/kinder/${kind.id}`}
                            className="rounded underline-offset-2 hover:underline"
                          />
                        }
                      >
                        {kind.vorname} {kind.nachname}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht}
                            {" · "}
                            {calculateAgeDecimal(kind.geburtsdatum)} Jahre
                          </span>
                          {kind.vertrag_gueltig_bis ? (
                            <span>
                              Vertrag gültig bis: {formatDate(kind.vertrag_gueltig_bis)}
                            </span>
                          ) : null}
                          {kind.notizen ? <span>Notiz: {kind.notizen}</span> : null}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-center">
                    <span title={GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht}>
                      {GESCHLECHT_KUERZEL[kind.geschlecht] ?? "–"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {kind.booking_time_bands?.label ?? "–"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-center",
                      warnung !== "rot" && "text-muted-foreground"
                    )}
                  >
                    {kind.weighting_factor_label ?? "Regelfaktor"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(kind.eintritt)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular-nums",
                      warnung === "hellrot" && "font-medium text-destructive"
                    )}
                  >
                    {formatDate(kind.austritt)}
                  </TableCell>
                  <TableCell
                    className={cn(warnung !== "rot" && "text-muted-foreground")}
                  >
                    {KIND_STATUS_LABEL[kind.status] ?? kind.status}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
