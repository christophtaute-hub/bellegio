import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { formatDate } from "@/lib/kita-datum";
import { loeseZeitraumAuf, zeitraumEnde, type ZeitraumParameter } from "@/lib/controlling/zeitraum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { canViewControlling, canViewFinanzen } from "@/lib/server/current-user-role";
import { ForecastKompakt, ForecastTable } from "@/components/forecast/forecast-table";
import { RechtsstandHinweise } from "@/components/forecast/rechtsstand-hinweise";
import { ZeitraumAuswahl } from "@/components/forecast/zeitraum-auswahl";
import { ExportButtons } from "@/components/forecast/export-buttons";
import { ZeitkategorieTabelle } from "@/components/forecast/zeitkategorie-tabelle";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

export default async function ControllingPage({
  searchParams,
}: {
  searchParams: Promise<ZeitraumParameter & { ansicht?: string }>;
}) {
  const parameter = await searchParams;
  const alleKennzahlen = parameter.ansicht === "alle";
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
        .select("kita_year_start_month, bundesland_code")
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

      <RechtsstandHinweise bundeslandCode={einrichtung?.bundesland_code ?? "by"} monate={months.map((m) => m.month)} zeigeFinanzen={zeigeFinanzen} />

      {months.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-1 text-sm print:hidden">
            {[
              { wert: "kompakt", label: "Kurz" },
              { wert: "alle", label: "Alle Kennzahlen" },
            ].map((a) => (
              <Link
                key={a.wert}
                href={`/controlling?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(parameter).filter(([, v]) => typeof v === "string")) as Record<string, string>), ansicht: a.wert })}`}
                aria-current={(alleKennzahlen ? "alle" : "kompakt") === a.wert ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  (alleKennzahlen ? "alle" : "kompakt") === a.wert ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a.label}
              </Link>
            ))}
          </div>
          {alleKennzahlen ? <ForecastTable months={months} zeigeFinanzen={zeigeFinanzen} /> : <ForecastKompakt months={months} zeigeFinanzen={zeigeFinanzen} />}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Daten verfügbar.
        </p>
      )}

      {alleKennzahlen && months.length > 0 ? (
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
