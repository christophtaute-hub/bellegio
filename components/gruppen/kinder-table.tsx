import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Scale, VenusAndMars } from "lucide-react";
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
import { KIND_STATUS_LABEL, GESCHLECHT_LABEL, WEIGHTING_FACTOR_KUERZEL } from "@/lib/constants";
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

export type GruppenSortSpalte = "name" | "buchungszeit" | "eintritt" | "austritt" | "status";

export type KindZeile = {
  frei: false;
  id: string;
  platz: number | null;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  notizAktuell: string | null;
  status: string;
  booking_time_bands: { label: string } | null;
  weighting_factor_label?: string | null;
  weighting_factor_code?: string | null;
};

export type FreieZeile = { frei: true; platz: number };

export type KinderTableRow = KindZeile | FreieZeile;

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

/** Sortierbarer Spaltenkopf — Klick ändert `sort`/`dir` in der URL, gilt gleichermaßen für die Tabellen "Aktive
 * Kinder" und "Nachrücker" auf derselben Seite (geteilter Zustand über die URL). */
function SortableHead({
  spalte,
  label,
  aktuelleSpalte,
  aktuelleRichtung,
  baseQuery,
}: {
  spalte: GruppenSortSpalte;
  label: string;
  aktuelleSpalte: GruppenSortSpalte | null;
  aktuelleRichtung: "asc" | "desc";
  baseQuery: string;
}) {
  const istAktiv = spalte === aktuelleSpalte;
  const naechsteRichtung = istAktiv && aktuelleRichtung === "asc" ? "desc" : "asc";
  const params = new URLSearchParams(baseQuery);
  params.set("sort", spalte);
  params.set("dir", naechsteRichtung);
  const Icon = !istAktiv ? ArrowUpDown : aktuelleRichtung === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead>
      <Link
        href={`?${params.toString()}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          istAktiv && "font-semibold text-foreground"
        )}
      >
        {label}
        <Icon className="size-3.5 text-muted-foreground" />
      </Link>
    </TableHead>
  );
}

export function KinderTable({
  rows,
  kitaYearStartMonth,
  highlightAustritt = false,
  emptyMessage,
  sort,
  dir,
  baseQuery,
}: {
  rows: KinderTableRow[];
  kitaYearStartMonth: number;
  highlightAustritt?: boolean;
  emptyMessage: string;
  sort: GruppenSortSpalte | null;
  dir: "asc" | "desc";
  baseQuery: string;
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
              <SortableHead spalte="name" label="Name" aktuelleSpalte={sort} aktuelleRichtung={dir} baseQuery={baseQuery} />
              <TableHead className="text-center">
                <SpaltenIcon icon={VenusAndMars} label="Geschlecht (m/w/d)" />
              </TableHead>
              <SortableHead spalte="buchungszeit" label="Zeit" aktuelleSpalte={sort} aktuelleRichtung={dir} baseQuery={baseQuery} />
              <TableHead className="text-center">
                <SpaltenIcon icon={Scale} label="Gewichtungsfaktor" />
              </TableHead>
              <SortableHead spalte="eintritt" label="Eintritt" aktuelleSpalte={sort} aktuelleRichtung={dir} baseQuery={baseQuery} />
              <SortableHead spalte="austritt" label="Austritt" aktuelleSpalte={sort} aktuelleRichtung={dir} baseQuery={baseQuery} />
              <SortableHead spalte="status" label="Status" aktuelleSpalte={sort} aktuelleRichtung={dir} baseQuery={baseQuery} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((zeile) => {
              if (zeile.frei) {
                return (
                  <TableRow key={`frei-${zeile.platz}`}>
                    <TableCell className="tabular-nums text-muted-foreground/50">{zeile.platz}</TableCell>
                    <TableCell colSpan={7} className="text-muted-foreground/50">
                      frei
                    </TableCell>
                  </TableRow>
                );
              }
              const kind = zeile;
              const warnung = highlightAustritt
                ? austrittWarnung(kind.austritt, kitaYearStartMonth)
                : null;
              const kuerzel = kind.weighting_factor_code
                ? (WEIGHTING_FACTOR_KUERZEL[kind.weighting_factor_code] ?? kind.weighting_factor_label)
                : "Regelfaktor";
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
                    {kind.platz ?? "offen"}
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
                          {kind.weighting_factor_label ? (
                            <span>Gewichtung: {kind.weighting_factor_label}</span>
                          ) : null}
                          {kind.vertrag_gueltig_bis ? (
                            <span>
                              Vertrag gültig bis: {formatDate(kind.vertrag_gueltig_bis)}
                            </span>
                          ) : null}
                          {kind.notizAktuell ? <span>Notiz: {kind.notizAktuell}</span> : null}
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
                    <span title={kind.weighting_factor_label ?? "Regelfaktor"}>{kuerzel}</span>
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
