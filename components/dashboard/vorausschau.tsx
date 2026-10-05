import Link from "next/link";
import { parseIsoDate } from "@/lib/kita-datum";
import { personalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import { VORAUSSCHAU_OPTIONEN, type SteuerungsDaten } from "@/lib/steuerung/lade-steuerung";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { cn } from "cn";

const AMPEL_WORT: Record<Ampel, string> = { gruen: "reicht", gelb: "knapp", rot: "fehlt" };
const AMPEL_KLASSE: Record<Ampel, string> = {
  gruen: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  gelb: "bg-amber-400/25 text-amber-900 dark:text-amber-200",
  rot: "bg-destructive/15 text-destructive",
};
const AMPEL_PUNKT: Record<Ampel, string> = { gruen: "bg-emerald-500", gelb: "bg-amber-500", rot: "bg-destructive" };

function monatKurz(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Belegung und Personal der nächsten Monate nebeneinander, auf einen Blick: je Monat ein Balken „Kinder von Plätzen“ und eine
 * Ampel fürs Personal (reicht / knapp / fehlt) samt Kennzahl (z. B. Anstellungsschlüssel). Der Zeitraum ist umschaltbar. */
export function Vorausschau({
  daten,
  monate,
  heute,
  stichtagParam,
}: {
  daten: SteuerungsDaten;
  monate: number;
  heute: string;
  stichtagParam: string | null;
}) {
  const reihe = daten.monate.slice(0, monate);
  const soll = daten.belegung.sollplaetze;
  const jetzt = reihe[0];
  const kennzahlJetzt = personalKennzahl(jetzt.personal);
  const ampelJetzt = jetzt.personal.daten.ampel;
  const linkFuer = (n: number) => `/dashboard?monate=${n}${stichtagParam ? `&stichtag=${stichtagParam}` : ""}`;
  const stichtagIstHeute = daten.stichtag === heute;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5" aria-labelledby="vorausschau-titel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="vorausschau-titel" className="font-heading text-lg text-primary">
            Belegung &amp; Personal
          </h2>
          <p className="text-xs text-muted-foreground">Wie viele Kinder kommen — und reicht das Personal dafür? Je Monat.</p>
        </div>
        <nav className="flex items-center gap-1 rounded-lg border bg-secondary/40 p-0.5" aria-label="Zeitraum der Vorausschau">
          {VORAUSSCHAU_OPTIONEN.map((n) => (
            <Link
              key={n}
              href={linkFuer(n)}
              scroll={false}
              aria-current={n === monate ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm tabular-nums transition-colors",
                n === monate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {n}
            </Link>
          ))}
          <span className="px-1.5 text-xs text-muted-foreground">Monate</span>
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/gruppen"
          className={cn(
            "flex flex-col gap-0.5 rounded-xl border px-4 py-3 transition-colors hover:border-primary/40",
            jetzt.kpis.kinderGesamt > soll && "border-destructive/30 bg-destructive/5"
          )}
        >
          <span className="text-xs text-muted-foreground">{stichtagIstHeute ? "Kinder jetzt" : "Kinder zum Stichtag"}</span>
          <span className="text-2xl font-semibold tabular-nums">
            {jetzt.kpis.kinderGesamt}
            <span className="text-base font-normal text-muted-foreground"> von {soll} Plätzen</span>
          </span>
        </Link>
        <Link href="/team" className={cn("flex flex-col gap-0.5 rounded-xl border px-4 py-3 transition-colors hover:border-primary/40", ampelJetzt === "rot" && "border-destructive/30 bg-destructive/5")}>
          <span className="text-xs text-muted-foreground">{kennzahlJetzt.label}</span>
          <span className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
            {kennzahlJetzt.value}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", AMPEL_KLASSE[ampelJetzt])}>{AMPEL_WORT[ampelJetzt]}</span>
          </span>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-full items-center gap-x-1.5 gap-y-2 text-center"
          style={{ gridTemplateColumns: `6.5rem repeat(${reihe.length}, minmax(4rem, 1fr))` }}
        >
          <div />
          {reihe.map((m, i) => (
            <div key={m.month} className="text-xs font-medium text-muted-foreground tabular-nums">
              {i === 0 && stichtagIstHeute ? "Jetzt" : monatKurz(m.month)}
            </div>
          ))}

          <div className="text-left text-xs leading-tight font-medium">
            Kinder
            <span className="block font-normal text-muted-foreground">von {soll} Plätzen</span>
          </div>
          {reihe.map((m) => {
            const kinder = m.kpis.kinderGesamt;
            const zuViel = kinder > soll;
            const anteil = soll > 0 ? Math.min(100, (kinder / soll) * 100) : 0;
            return (
              <div key={m.month} className="flex flex-col items-center gap-1">
                <span className={cn("text-sm font-semibold tabular-nums", zuViel && "text-destructive")}>{kinder}</span>
                <span className="flex h-12 w-5 items-end overflow-hidden rounded-md bg-secondary" role="img" aria-label={`${kinder} von ${soll} Plätzen belegt`}>
                  <span className={cn("w-full rounded-md", zuViel ? "bg-destructive" : "bg-primary/70")} style={{ height: `${anteil}%` }} />
                </span>
              </div>
            );
          })}

          <div className="text-left text-xs leading-tight font-medium">
            Personal
            <span className="block font-normal text-muted-foreground">{kennzahlJetzt.label}</span>
          </div>
          {reihe.map((m) => {
            const ampel = m.personal.daten.ampel;
            return (
              <div key={m.month} className="flex flex-col items-center gap-1">
                <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", AMPEL_KLASSE[ampel])}>
                  <span className={cn("size-1.5 rounded-full", AMPEL_PUNKT[ampel])} aria-hidden />
                  {AMPEL_WORT[ampel]}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground tabular-nums">{personalKennzahl(m.personal).value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
