import Link from "next/link";
import { Radar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString, parseIsoDate } from "@/lib/kita-datum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { berechneSchluesselRadar, type RadarAustritt } from "@/lib/radar/schluessel-radar";
import { cn } from "cn";

const RADAR_MONATE = 18;

const AMPEL_KLASSE = {
  gruen: "bg-emerald-400/80",
  gelb: "bg-amber-400",
  rot: "bg-destructive",
} as const;

const MODELL_LABEL = {
  bayern: "Anstellungsschlüssel (Bayern)",
  bw: "Personalschlüssel (KiTaVO Baden-Württemberg)",
  nrw: "Personalstunden (KiBiz Nordrhein-Westfalen)",
} as const;

function monatLang(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}
function monatKurz(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function SchluesselRadarSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-2xl border bg-secondary/30" aria-hidden="true" />
  );
}

/** Frühwarnung: ab welchem Monat kippt der Personalschlüssel, wie viele Stunden
 * fehlen, was hilft — je Bundesland im eigenen Rechenmodell. */
export async function SchluesselRadar({ einrichtungId }: { einrichtungId: string }) {
  const supabase = await createClient();
  const heute = new Date();
  const start = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));

  const [months, { data: einrichtung }, { data: team }] = await Promise.all([
    buildForecastMonths(supabase, einrichtungId, start, RADAR_MONATE),
    supabase.from("einrichtungen").select("vollzeit_wochenstunden").eq("id", einrichtungId).single(),
    supabase
      .from("team")
      .select("vorname, nachname, austritt, wochenstunden")
      .eq("einrichtung_id", einrichtungId)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .not("austritt", "is", null)
      .gte("austritt", start),
  ]);
  if (months.length === 0) return null;

  const austritte: RadarAustritt[] = (team ?? []).map((t) => ({
    name: [t.vorname, t.nachname].filter(Boolean).join(" "),
    austritt: t.austritt as string,
    wochenstunden: Number(t.wochenstunden ?? 0),
  }));
  const radar = berechneSchluesselRadar(months, Number(einrichtung?.vollzeit_wochenstunden ?? 39), austritte);
  const kritisch = radar.ersterEngpass ?? radar.ersteWarnung;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Radar className="size-4" />
        </div>
        <div>
          <h2 className="font-heading text-lg leading-tight text-primary">Schlüssel-Radar</h2>
          <p className="text-xs text-muted-foreground">
            {MODELL_LABEL[radar.modell]} — die nächsten {RADAR_MONATE} Monate
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          {radar.monate.map((m) => (
            <div
              key={m.monat}
              title={`${monatLang(m.monat)}: ${m.detail}`}
              className={cn("h-7 flex-1 rounded", AMPEL_KLASSE[m.ampel])}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{monatKurz(radar.monate[0].monat)}</span>
          <span>{monatKurz(radar.monate[Math.floor(radar.monate.length / 2)].monat)}</span>
          <span>{monatKurz(radar.monate[radar.monate.length - 1].monat)}</span>
        </div>
      </div>

      {kritisch ? (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl border p-4 text-sm",
            radar.ersterEngpass ? "border-destructive/30 bg-destructive/5" : "border-amber-400/50 bg-amber-50 dark:bg-amber-500/10"
          )}
        >
          <p className={cn("font-medium", radar.ersterEngpass ? "text-destructive" : "text-amber-800 dark:text-amber-400")}>
            {radar.ersterEngpass ? "Erster Engpass" : "Erste Warnung"}: {monatLang(kritisch.monat)}
            {kritisch.fehlendeStunden > 0
              ? ` — es fehlen rund ${Math.ceil(kritisch.fehlendeStunden).toLocaleString("de-DE")} Wochenstunden`
              : ""}
          </p>
          <p className="text-muted-foreground">{kritisch.detail}</p>
          {radar.ursache ? (
            <p>
              <span className="font-medium">Ursache:</span> {radar.ursache}
            </p>
          ) : null}
          {radar.empfehlungen.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {radar.empfehlungen.map((e) => (
                <li key={e} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/szenario" className="self-start text-primary underline-offset-2 hover:underline">
            Im Szenario-Rechner durchspielen →
          </Link>
        </div>
      ) : (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-400">
          Keine Engpässe in den nächsten {RADAR_MONATE} Monaten — der Personalschlüssel bleibt erfüllt.
        </p>
      )}

      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400/80" />erfüllt</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" />knapp</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" />nicht erfüllt</span>
      </div>
    </section>
  );
}
