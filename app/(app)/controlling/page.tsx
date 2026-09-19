import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { getKinderPresenceAtDate, buildCompositionMatrix } from "@/lib/dashboard/presence";
import { getKalenderjahrKategorisierung } from "@/lib/controlling/jahreskategorisierung";
import { canViewControlling } from "@/lib/server/current-user-role";
import { ForecastTable } from "@/components/forecast/forecast-table";
import { ZeitraumPicker } from "@/components/forecast/zeitraum-picker";
import { ExportButtons } from "@/components/forecast/export-buttons";
import { ZeitkategorieTabelle } from "@/components/forecast/zeitkategorie-tabelle";
import { KalenderjahrKategorisierungTabelle } from "@/components/forecast/kalenderjahr-kategorisierung-tabelle";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

const DEFAULT_MONTH_COUNT = 12;
const MAX_MONTH_COUNT = 24;

function kitajahrStart(today: Date, kitaYearStartMonth: number): Date {
  const currentMonth = today.getUTCMonth() + 1;
  const year =
    currentMonth >= kitaYearStartMonth
      ? today.getUTCFullYear()
      : today.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, kitaYearStartMonth - 1, 1));
}

function letztesKalenderjahrStart(today: Date): Date {
  return new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
}

async function buildBudgetReferenz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  einrichtungId: string,
  jahrStart: string
) {
  const months = Array.from({ length: 12 }, (_, i) =>
    toIsoDateString(addMonthsUtc(parseIsoDate(jahrStart), i))
  );

  const totalsByLabel = new Map<string, number[]>();
  for (const month of months) {
    const rows = await getKinderPresenceAtDate(supabase, einrichtungId, month);
    const matrix = buildCompositionMatrix(rows);
    for (const row of matrix.rows) {
      const list = totalsByLabel.get(row.weightingLabel) ?? [];
      list.push(row.total);
      totalsByLabel.set(row.weightingLabel, list);
    }
  }

  return Array.from(totalsByLabel.entries()).map(([label, values]) => ({
    label,
    durchschnitt: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}

export default async function ControllingPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; monate?: string; jahr?: string }>;
}) {
  const { von, monate, jahr } = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const erlaubt = einrichtungId
    ? await canViewControlling(supabase, einrichtungId)
    : false;

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

  const today = new Date();
  const kitajahrStartIso = toIsoDateString(
    kitajahrStart(today, einrichtung?.kita_year_start_month ?? 9)
  );
  const letztesKalenderjahrIso = toIsoDateString(letztesKalenderjahrStart(today));

  const vonMonth = von ?? kitajahrStartIso;
  const monthCount = Math.min(
    MAX_MONTH_COUNT,
    Math.max(1, Number(monate) || DEFAULT_MONTH_COUNT)
  );

  const kategorisierungJahr = Math.min(
    today.getUTCFullYear() + 1,
    Math.max(2020, Number(jahr) || today.getUTCFullYear())
  );

  const [months, budgetReferenz, kategorisierung] = einrichtungId
    ? await Promise.all([
        buildForecastMonths(supabase, einrichtungId, vonMonth, monthCount),
        buildBudgetReferenz(supabase, einrichtungId, letztesKalenderjahrIso),
        getKalenderjahrKategorisierung(supabase, einrichtungId, kategorisierungJahr),
      ])
    : [[], [], null];

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
          <ExportButtons
            months={months}
            kategorisierung={kategorisierung ? { jahr: kategorisierungJahr, monate: kategorisierung } : undefined}
          />
          </div>
        ) : null}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Belegung und Personalbedarf im Zeitverlauf — Rückblick aufs
        Kalenderjahr genauso wie vorausschauende Personalplanung.
      </p>

      <ZeitraumPicker
        basePath="/controlling"
        vonMonth={vonMonth}
        monthCount={monthCount}
        kitajahrStartIso={kitajahrStartIso}
        letztesKalenderjahrIso={letztesKalenderjahrIso}
      />

      {months.length > 0 ? (
        <ForecastTable months={months} />
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

      {kategorisierung ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg text-primary">
              Kategorisierung nach Kalenderjahr (Kinder- und Jugendhilfestatistik)
            </h2>
            <form className="flex items-end gap-2" method="get">
              <input type="hidden" name="von" value={vonMonth} />
              <input type="hidden" name="monate" value={monthCount} />
              <div className="flex flex-col gap-1">
                <label htmlFor="jahr" className="text-xs text-muted-foreground">
                  Kalenderjahr
                </label>
                <Input
                  id="jahr"
                  name="jahr"
                  type="number"
                  min={2020}
                  max={today.getUTCFullYear() + 1}
                  defaultValue={kategorisierungJahr}
                  className="h-8 w-28"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Anzeigen
              </Button>
            </form>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Für jeden Monat des Jahres (Stichtag jeweils der Erste) die Kinder
            nach vertraglich vereinbarter wöchentlicher Betreuungszeit — mit
            eigener Zeile für Kinder mit I-Status. Der 1. März ist der amtliche
            Erhebungsstichtag. Die Bänder entsprechen keinem bundesweit
            einheitlichen Meldebogen — vor der ersten echten Meldung mit dem
            zuständigen Jugendamt/Statistischen Landesamt abgleichen (siehe
            Dokumentation).
          </p>
          <KalenderjahrKategorisierungTabelle monate={kategorisierung} />
        </div>
      ) : null}

      {budgetReferenz.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg text-primary">
            Budget-Referenzwerte fürs kommende Jahr
          </h2>
          <p className="text-sm text-muted-foreground">
            Durchschnittliche Kinderzahl je Gewichtungsfaktor-Kategorie im
            letzten Kalenderjahr — als Orientierung für die eigene
            Personal-/Budgetplanung, kein automatisch übernommener Wert.
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {budgetReferenz.map((ref) => (
              <div
                key={ref.label}
                className="rounded-xl border bg-secondary/40 p-4"
              >
                <p className="text-xs text-muted-foreground">{ref.label}</p>
                <p className="text-2xl font-semibold text-primary">
                  {ref.durchschnitt.toLocaleString("de-DE", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
