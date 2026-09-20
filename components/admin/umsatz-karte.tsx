import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { formatEuro } from "@/lib/admin/abrechnung";
import type { UmsatzKennzahlen } from "@/lib/admin/einnahmen";

/** Große Umsatzkarte im Stil einer Einnahmenübersicht: Zeitraum mit Blätterpfeilen, Umsatz als
 * Hauptzahl, Vergleich zur Vorperiode und die Aufteilung in bezahlt, offen und überfällig. */
export function UmsatzKarte({
  eyebrow,
  titel,
  kennzahlen,
  veraenderung,
  vergleichLabel,
  zurueckHref,
  weiterHref,
}: {
  eyebrow: string;
  titel: string;
  kennzahlen: UmsatzKennzahlen;
  veraenderung: number | null;
  vergleichLabel: string;
  zurueckHref: string;
  /** Fehlt beim laufenden Zeitraum — in die Zukunft gibt es nichts zu blättern. */
  weiterHref: string | null;
}) {
  const pfeil = "flex size-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
          <h2 className="font-heading text-lg text-primary">{titel}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={zurueckHref} className={pfeil} aria-label={`Vorheriger Zeitraum vor ${titel}`}>
            <ChevronLeft className="size-4" />
          </Link>
          {weiterHref ? (
            <Link href={weiterHref} className={pfeil} aria-label={`Nächster Zeitraum nach ${titel}`}>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={cn(pfeil, "pointer-events-none opacity-30")} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-heading text-4xl tracking-tight whitespace-nowrap tabular-nums">{formatEuro(kennzahlen.umsatz)}</p>
        <p className="text-sm text-muted-foreground">
          Umsatz netto · {kennzahlen.anzahl} {kennzahlen.anzahl === 1 ? "Rechnung" : "Rechnungen"}
          {veraenderung !== null ? (
            <>
              {" · "}
              <span className={cn("font-medium", veraenderung >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                {veraenderung >= 0 ? "+" : ""}
                {veraenderung.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %
              </span>{" "}
              {vergleichLabel}
            </>
          ) : null}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Bezahlt</dt>
          <dd className="font-medium whitespace-nowrap tabular-nums text-emerald-700 dark:text-emerald-400">{formatEuro(kennzahlen.bezahlt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Offen</dt>
          <dd className="font-medium whitespace-nowrap tabular-nums">{formatEuro(kennzahlen.offen)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Überfällig</dt>
          <dd className={cn("font-medium whitespace-nowrap tabular-nums", kennzahlen.ueberfaellig > 0 && "text-destructive")}>
            {formatEuro(kennzahlen.ueberfaellig)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
