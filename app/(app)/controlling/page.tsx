import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { formatDate } from "@/lib/kita-datum";
import { loeseZeitraumAuf, zeitraumEnde, type ZeitraumParameter } from "@/lib/controlling/zeitraum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { canViewControlling, canViewFinanzen } from "@/lib/server/current-user-role";
import { ForecastTable } from "@/components/forecast/forecast-table";
import { ZeitraumAuswahl } from "@/components/forecast/zeitraum-auswahl";
import { ExportButtons } from "@/components/forecast/export-buttons";
import { ZeitkategorieTabelle } from "@/components/forecast/zeitkategorie-tabelle";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function ControllingPage({
  searchParams,
}: {
  searchParams: Promise<ZeitraumParameter>;
}) {
  const parameter = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const erlaubt = einrichtungId
    ? await canViewControlling(supabase, einrichtungId)
    : false;
  const zeigeFinanzen = einrichtungId ? await canViewFinanzen(supabase, einrichtungId) : false;

  if (!erlaubt) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Controlling
        </h1>
        <p className="text-sm text-muted-foreground">
          Für diesen Bereich hast du keinen Zugriff auf die aktuelle
          Einrichtung.
        </p>
      </div>
    );
  }

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("kita_year_start_month")
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  const heute = new Date();
  const kitajahrBeginnMonat = einrichtung?.kita_year_start_month ?? 9;
  const zeitraum = loeseZeitraumAuf(parameter, kitajahrBeginnMonat, heute);

  const months = einrichtungId
    ? await buildForecastMonths(supabase, einrichtungId, zeitraum.von, zeitraum.monate, zeigeFinanzen)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Controlling
        </h1>
        {months.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/controlling/mappe" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Prüfungsmappe
            </Link>
            <ExportButtons months={months} zeigeFinanzen={zeigeFinanzen} />
          </div>
        ) : null}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Belegung, Personal und Ergebnis im Zeitverlauf — Rückblick genauso wie
        vorausschauende Planung. Die Kategorisierung nach Wochenstunden steht in der{" "}
        <Link href="/controlling/mappe" className="text-primary underline-offset-2 hover:underline">
          Prüfungsmappe
        </Link>
        .
      </p>

      <ZeitraumAuswahl
        basePath="/controlling"
        art={zeitraum.art}
        jahr={zeitraum.jahr}
        bisJahr={zeitraum.bisJahr}
        kitajahrBeginnMonat={kitajahrBeginnMonat}
        aktuellesJahr={heute.getUTCFullYear()}
        beschreibung={`${zeitraum.label}: ${formatDate(zeitraum.von)} – ${formatDate(zeitraumEnde(zeitraum))}`}
      />

      {months.length > 0 ? (
        <ForecastTable months={months} zeigeFinanzen={zeigeFinanzen} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Daten verfügbar.
        </p>
      )}

      {months.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg text-primary">
            Zeitkategorie je Monat
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Wie viele Kinder in welcher Zeitkategorie waren — je Bundesland
            so, wie es dort tatsächlich erfasst wird.
          </p>
          <ZeitkategorieTabelle months={months} />
        </div>
      ) : null}
    </div>
  );
}
