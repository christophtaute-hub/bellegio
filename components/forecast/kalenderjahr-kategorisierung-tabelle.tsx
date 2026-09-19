import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import type { KategorisierungsMonat } from "@/lib/controlling/jahreskategorisierung";

const MONATSNAMEN = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
/** Amtlicher Erhebungsstichtag der Kinder- und Jugendhilfestatistik. */
const STATISTIK_STICHTAG_MONAT_INDEX = 2;

function Zahl({ wert }: { wert: number }) {
  return <>{wert === 0 ? <span className="text-muted-foreground/50">–</span> : wert}</>;
}

/** Bänder × Monate. Leere Bänder werden ausgeblendet, die I-Status-Zeile eines
 * Bandes erscheint nur, wenn dort im Jahr mindestens ein Kind mit I-Status
 * war — die Summenzeilen zeigen den I-Status dagegen immer. */
export function KalenderjahrKategorisierungTabelle({
  monate,
}: {
  monate: KategorisierungsMonat[];
}) {
  if (monate.length === 0) return null;

  const bandZeilen = monate[0].baender.map((band, bandIndex) => {
    const kinderProMonat = monate.map((m) => m.baender[bandIndex].anzahlKinder);
    const iStatusProMonat = monate.map((m) => m.baender[bandIndex].davonMitBehinderung);
    return {
      grenze: band.grenze,
      label: band.label,
      kinderProMonat,
      iStatusProMonat,
      hatKinder: kinderProMonat.some((n) => n > 0),
      hatIStatus: iStatusProMonat.some((n) => n > 0),
    };
  });
  const sichtbar = bandZeilen.filter((z) => z.hatKinder);
  const ausgeblendet = bandZeilen.length - sichtbar.length;

  const summeKinder = monate.map((_, i) => bandZeilen.reduce((s, z) => s + z.kinderProMonat[i], 0));
  const summeIStatus = monate.map((_, i) => bandZeilen.reduce((s, z) => s + z.iStatusProMonat[i], 0));
  const nichtZugeordnetGesamt = monate.reduce((s, m) => Math.max(s, m.nichtZugeordnet), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Wochenstunden</TableHead>
              {monate.map((m, i) => (
                <TableHead
                  key={m.monat}
                  className={cn(
                    "text-right whitespace-nowrap",
                    i === STATISTIK_STICHTAG_MONAT_INDEX && "bg-accent/15 text-foreground"
                  )}
                >
                  {MONATSNAMEN[i]}
                  {i === STATISTIK_STICHTAG_MONAT_INDEX ? (
                    <span className="block text-[10px] font-normal leading-none text-muted-foreground">
                      Statistik-Stichtag
                    </span>
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sichtbar.map((zeile) => (
              <BandZeilen key={zeile.grenze} zeile={zeile} />
            ))}
            <TableRow className="bg-secondary/40 font-semibold">
              <TableCell className="sticky left-0 z-10 bg-secondary">Summe Kinder</TableCell>
              {summeKinder.map((n, i) => (
                <TableCell key={monate[i].monat} className="text-right tabular-nums">
                  {n}
                </TableCell>
              ))}
            </TableRow>
            <TableRow className="bg-accent/10 font-semibold">
              <TableCell className="sticky left-0 z-10 bg-accent/10 backdrop-blur-sm">
                davon mit I-Status
              </TableCell>
              {summeIStatus.map((n, i) => (
                <TableCell key={monate[i].monat} className="text-right tabular-nums">
                  {n}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {nichtZugeordnetGesamt > 0 ? (
        <p className="text-xs text-muted-foreground">
          Bis zu {nichtZugeordnetGesamt} Kinder je Monat konnten mangels
          hinterlegter Buchungszeit/Gruppen-Konfiguration keinem Band zugeordnet
          werden und sind oben nicht enthalten.
        </p>
      ) : null}
      {ausgeblendet > 0 ? (
        <p className="text-xs text-muted-foreground">
          {ausgeblendet} Bänder ohne Kinder in diesem Jahr sind ausgeblendet.
        </p>
      ) : null}
    </div>
  );
}

function BandZeilen({
  zeile,
}: {
  zeile: {
    label: string;
    kinderProMonat: number[];
    iStatusProMonat: number[];
    hatIStatus: boolean;
  };
}) {
  return (
    <>
      <TableRow>
        <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">
          {zeile.label}
        </TableCell>
        {zeile.kinderProMonat.map((n, i) => (
          <TableCell key={i} className="text-right tabular-nums">
            <Zahl wert={n} />
          </TableCell>
        ))}
      </TableRow>
      {zeile.hatIStatus ? (
        <TableRow className="bg-accent/10">
          <TableCell className="sticky left-0 z-10 bg-card pl-6 text-xs text-muted-foreground whitespace-nowrap">
            {zeile.label} — I-Status
          </TableCell>
          {zeile.iStatusProMonat.map((n, i) => (
            <TableCell key={i} className="text-right text-xs tabular-nums">
              <Zahl wert={n} />
            </TableCell>
          ))}
        </TableRow>
      ) : null}
    </>
  );
}
