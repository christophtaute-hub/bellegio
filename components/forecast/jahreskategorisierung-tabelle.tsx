import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JahreskategorisierungBand } from "@/lib/controlling/jahreskategorisierung";

export function JahreskategorisierungTabelle({
  baender,
  nichtZugeordnet,
}: {
  baender: JahreskategorisierungBand[];
  nichtZugeordnet: number;
}) {
  const gesamt = baender.reduce((sum, b) => sum + b.anzahlKinder, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wochenstunden</TableHead>
              <TableHead className="text-right">Kinder</TableHead>
              <TableHead className="text-right">
                davon mit (drohender) Behinderung
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baender.map((band) => (
              <TableRow key={band.grenze}>
                <TableCell className="font-medium">{band.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {band.anzahlKinder}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {band.davonMitBehinderung}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-secondary/40 font-semibold">
              <TableCell>Summe</TableCell>
              <TableCell className="text-right tabular-nums">{gesamt}</TableCell>
              <TableCell className="text-right tabular-nums">
                {baender.reduce((sum, b) => sum + b.davonMitBehinderung, 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {nichtZugeordnet > 0 ? (
        <p className="text-xs text-muted-foreground">
          {nichtZugeordnet} Kinder konnten mangels hinterlegter
          Buchungszeit/Gruppen-Konfiguration keinem Band zugeordnet werden.
        </p>
      ) : null}
    </div>
  );
}
