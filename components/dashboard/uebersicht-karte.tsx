import Link from "next/link";
import { ERGEBNIS_HINWEIS } from "@/lib/finanzen/hinweise";
import { createClient } from "@/lib/supabase/server";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import {
  UEBERSICHT_MODI,
  baueUebersichtPunkte,
  summiereUebersicht,
  uebersichtStartMonat,
  type UebersichtModus,
  type UebersichtZeitraum,
} from "@/lib/dashboard/uebersicht";
import { Skeleton } from "@/components/ui/skeleton";
import { UebersichtChart } from "@/components/dashboard/uebersicht-chart";

const euro = (wert: number) => wert.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const zahl = (wert: number) => wert.toLocaleString("de-DE", { maximumFractionDigits: 1 });

function wahl(aktiv: boolean) {
  return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${aktiv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;
}

export function UebersichtSkeleton() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5" aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </section>
  );
}

/** "Übersicht"-Karte: 12 Monate als Flächendiagramm mit Kopfzahlen, umschaltbar zwischen Kalenderjahr/Kitajahr und
 * Belegung/Finanzen (Finanzen nur mit Finanzen-Recht). Nutzt dieselbe Forecast-Berechnung wie das Controlling und wird
 * deshalb gestreamt (Suspense), weil sie etwas dauert. Die Auswahl steckt in der URL, bleibt also ein Server-Render. */
export async function UebersichtKarte({
  einrichtungId,
  zeitraum,
  modus,
  zeigeFinanzen,
  stichtagParam,
}: {
  einrichtungId: string;
  zeitraum: UebersichtZeitraum;
  modus: UebersichtModus;
  zeigeFinanzen: boolean;
  stichtagParam?: string;
}) {
  const supabase = await createClient();
  const { data: einrichtung } = await supabase.from("einrichtungen").select("kita_year_start_month").eq("id", einrichtungId).single();
  const start = uebersichtStartMonat(new Date(), zeitraum, einrichtung?.kita_year_start_month ?? 9);
  const monate = await buildForecastMonths(supabase, einrichtungId, start, 12, modus === "finanzen");
  const punkte = baueUebersichtPunkte(monate, modus);
  const summe = summiereUebersicht(punkte, modus);
  const meta = UEBERSICHT_MODI[modus];
  const fmt = meta.euro ? euro : zahl;

  const link = (z: UebersichtZeitraum, m: UebersichtModus) => {
    const params = new URLSearchParams();
    if (stichtagParam) params.set("stichtag", stichtagParam);
    params.set("zeitraum", z);
    params.set("modus", m);
    return `/dashboard?${params.toString()}`;
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-primary">Übersicht</h2>
        <div className="flex flex-wrap gap-2">
          {zeigeFinanzen ? (
            <div className="flex rounded-lg border p-0.5">
              {(Object.keys(UEBERSICHT_MODI) as UebersichtModus[]).map((m) => (
                <Link key={m} href={link(zeitraum, m)} className={wahl(modus === m)}>
                  {UEBERSICHT_MODI[m].titel}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="flex rounded-lg border p-0.5">
            <Link href={link("kitajahr", modus)} className={wahl(zeitraum === "kitajahr")}>
              Kitajahr
            </Link>
            <Link href={link("kalenderjahr", modus)} className={wahl(zeitraum === "kalenderjahr")}>
              Kalenderjahr
            </Link>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">{modus === "belegung" ? "Ø " : ""}{meta.erste}</dt>
          <dd className="text-lg font-semibold tabular-nums">{fmt(summe.erste)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{modus === "belegung" ? "Ø " : ""}{meta.zweite}</dt>
          <dd className="text-lg font-semibold tabular-nums">{fmt(summe.zweite)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{modus === "belegung" ? "Ø " : ""}{meta.differenz}</dt>
          <dd className={`text-lg font-semibold tabular-nums ${summe.differenz < 0 && modus === "finanzen" ? "text-destructive" : ""}`}>
            {fmt(summe.differenz)}
          </dd>
        </div>
      </dl>

      <UebersichtChart punkte={punkte} ersteName={meta.erste} zweiteName={meta.zweite} alsEuro={meta.euro} />
      {modus === "finanzen" ? <p className="text-xs text-muted-foreground">{ERGEBNIS_HINWEIS}</p> : null}
    </section>
  );
}
