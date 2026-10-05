"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Ring } from "@/components/dashboard/ring";
import type { CockpitDaten, MonatsStatus } from "@/lib/steuerung/cockpit";
import { cn } from "cn";

const ZEITRAEUME = [3, 6, 9, 12, 18, 24] as const;

const PUNKT: Record<MonatsStatus, string> = {
  ok: "bg-emerald-500",
  knapp: "bg-amber-500",
  fehlt: "bg-destructive",
  ueberhang: "bg-sky-500",
};
const PUNKT_HEX: Record<MonatsStatus, string> = { ok: "#10b981", knapp: "#f59e0b", fehlt: "#dc2626", ueberhang: "#0ea5e9" };
const WORT: Record<MonatsStatus, string> = { ok: "In Ordnung", knapp: "Knapp", fehlt: "Zu wenig Personal", ueberhang: "Mehr Personal als nötig" };
const WORT_KLASSE: Record<MonatsStatus, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  knapp: "text-amber-700 dark:text-amber-400",
  fehlt: "text-destructive",
  ueberhang: "text-sky-700 dark:text-sky-400",
};

function jetztStatus(c: CockpitDaten): MonatsStatus {
  return c.monate[0]?.status ?? "ok";
}

/** Das Herzstück des Dashboards: zwei Ringe (Kinder, Personal), eine Kurve für die nächsten Monate, eine Punktzeile zum Anklicken.
 * Alles in Prozent, Farben und Wörtern — ohne Fachbegriffe; die stehen nur in der kleinen Zeile darunter. */
export function Cockpit({
  cockpit,
  monate,
  stichtagParam,
  jetztLabel,
}: {
  cockpit: CockpitDaten;
  /** Gewählter Zeitraum in Monaten (die Daten sind schon darauf gekürzt). */
  monate: number;
  /** Gesetzt, wenn ein anderer Stichtag als heute gewählt ist (bleibt beim Umschalten erhalten). */
  stichtagParam: string | null;
  /** „Jetzt“ bei Stichtag heute, sonst das Datum. */
  jetztLabel: string;
}) {
  const reihe = cockpit.monate;
  const ersterProblem = reihe.findIndex((m) => m.status === "fehlt" || m.status === "knapp");
  const [gewaehlt, setGewaehlt] = useState(ersterProblem >= 0 ? ersterProblem : 0);
  const aktuell = reihe[Math.min(gewaehlt, reihe.length - 1)];
  const { jetzt, satz } = cockpit;
  const status = jetztStatus(cockpit);

  const belegungFarbe = jetzt.belegungTon === "zuviel" ? "text-destructive" : "text-primary";
  const personalFarbe =
    status === "fehlt" ? "text-destructive" : status === "knapp" ? "text-amber-500" : status === "ueberhang" ? "text-sky-500" : "text-emerald-500";

  // Die Achse ist fest (0–140 %), damit Balken ehrlich bleiben und ein riesiger Überhang die Kurve nicht plattdrückt.
  const OBEN = 140;
  const daten = reihe.map((m, i) => ({
    i,
    label: i === 0 ? jetztLabel : m.label,
    belegung: Math.min(OBEN, m.belegungProzent),
    personal: Math.min(OBEN, m.personalProzent),
    status: m.status,
  }));

  const SatzIcon = satz.ton === "ok" ? CheckCircle2 : satz.ton === "info" ? Info : AlertTriangle;

  return (
    <section className="flex flex-col gap-6 rounded-3xl border bg-card p-5 md:p-7" aria-labelledby="cockpit-titel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="cockpit-titel" className="font-heading text-xl text-primary">
            Kinder &amp; Personal
          </h2>
          <p className="text-sm text-muted-foreground">Wie viele Kinder sind da — und reicht das Personal?</p>
        </div>
        <nav className="flex items-center gap-0.5 rounded-full border bg-secondary/40 p-0.5" aria-label="Zeitraum">
          {ZEITRAEUME.map((n) => (
            <Link
              key={n}
              href={`/dashboard?monate=${n}${stichtagParam ? `&stichtag=${stichtagParam}` : ""}`}
              scroll={false}
              aria-current={n === monate ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm tabular-nums transition-colors",
                n === monate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {n}
            </Link>
          ))}
          <span className="px-2 text-xs text-muted-foreground">Monate</span>
        </nav>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/gruppen" className="flex items-center gap-5 rounded-2xl bg-secondary/40 p-5 transition-colors hover:bg-secondary/70">
          <Ring anteil={jetzt.plaetze > 0 ? jetzt.kinder / jetzt.plaetze : 0} farbe={belegungFarbe} beschreibung={`${jetzt.kinder} von ${jetzt.plaetze} Plätzen belegt`}>
            <span className="text-4xl font-semibold tabular-nums leading-none">{jetzt.kinder}</span>
            <span className="mt-1 text-xs text-muted-foreground">von {jetzt.plaetze}</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-muted-foreground">Kinder</span>
            <span className={cn("text-lg font-semibold", jetzt.belegungTon === "zuviel" && "text-destructive")}>{jetzt.belegungWort}</span>
            <span className="text-xs text-muted-foreground">Plätze belegt</span>
          </div>
        </Link>

        <Link href="/team" className="flex items-center gap-5 rounded-2xl bg-secondary/40 p-5 transition-colors hover:bg-secondary/70">
          <Ring anteil={jetzt.personalProzent / 100} farbe={personalFarbe} beschreibung={`Personal: ${jetzt.personalProzent} Prozent des nötigen`}>
            <span className="text-4xl font-semibold tabular-nums leading-none">{jetzt.personalProzent}</span>
            <span className="mt-1 text-xs text-muted-foreground">Prozent</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-muted-foreground">Personal</span>
            <span className={cn("text-lg font-semibold", WORT_KLASSE[status])}>{jetzt.personalWort}</span>
            <span className="text-xs text-muted-foreground">{jetzt.personalKlartext}</span>
            <span className="text-[11px] text-muted-foreground/80">
              {jetzt.fachKennzahl.label}: {jetzt.fachKennzahl.value}
            </span>
          </div>
        </Link>
      </div>

      <p
        className={cn(
          "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-medium",
          satz.ton === "ok" && "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
          satz.ton === "info" && "bg-sky-500/10 text-sky-900 dark:text-sky-200",
          satz.ton === "warnung" && "bg-amber-400/20 text-amber-950 dark:text-amber-100",
          satz.ton === "engpass" && "bg-destructive/10 text-destructive"
        )}
      >
        <SatzIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        {satz.text}
      </p>

      {cockpit.empfehlungen.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-secondary/50 p-4 text-sm">
          <p className="font-medium">Was hilft?</p>
          {cockpit.empfehlungen.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <Link href="/szenario" className="self-start text-primary underline-offset-2 hover:underline">
            In der Planung durchspielen →
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="h-56 w-full" role="img" aria-label="Kinder und Personal in Prozent, je Monat">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={daten}
              margin={{ top: 10, right: 16, bottom: 0, left: 16 }}
              onClick={(e) => {
                const index = (e as { activeTooltipIndex?: number } | null)?.activeTooltipIndex;
                if (typeof index === "number") setGewaehlt(index);
              }}
            >
              <XAxis dataKey="label" hide />
              <YAxis hide domain={[0, OBEN]} />
              <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "genau richtig", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Bar dataKey="belegung" name="Kinder" fill="var(--primary)" fillOpacity={0.28} radius={[8, 8, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="personal"
                name="Personal"
                stroke="var(--foreground)"
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={(p) => {
                  const { cx, cy, index } = p as { cx: number; cy: number; index: number };
                  const d = daten[index];
                  return (
                    <circle key={index} cx={cx} cy={cy} r={index === gewaehlt ? 7 : 4.5} fill={PUNKT_HEX[d.status]} stroke="var(--card)" strokeWidth={2} />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-primary/30" />
            Kinder (von den Plätzen)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-foreground" />
            Personal (vom nötigen)
          </span>
          <span>Über der Linie: genug. Darunter: zu wenig.</span>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex min-w-full justify-between gap-1" aria-label="Monate">
            {reihe.map((m, i) => (
              <li key={m.monat} className="min-w-[3.25rem] flex-1">
                <button
                  type="button"
                  onClick={() => setGewaehlt(i)}
                  aria-pressed={i === gewaehlt}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-secondary/60",
                    i === gewaehlt && "bg-secondary"
                  )}
                >
                  <span className={cn("size-3 rounded-full", PUNKT[m.status])} aria-hidden />
                  <span className="text-sm font-semibold tabular-nums">{m.kinder}</span>
                  <span className="text-[11px] text-muted-foreground">{i === 0 ? jetztLabel : m.label}</span>
                  <span className="sr-only">{WORT[m.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {aktuell ? (
          <div className="flex flex-col gap-1 rounded-2xl border p-4" aria-live="polite">
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-semibold">{gewaehlt === 0 ? jetztLabel : aktuell.label}</span>
              <span className="text-muted-foreground">
                {aktuell.kinder} von {aktuell.plaetze} Plätzen
              </span>
              <span className={cn("font-medium", WORT_KLASSE[aktuell.status])}>· {WORT[aktuell.status]}</span>
            </p>
            <p className="text-sm">{aktuell.text}</p>
            {aktuell.ereignisse.length > 0 ? <p className="text-sm text-muted-foreground">{aktuell.ereignisse.join(" · ")}</p> : null}
            <p className="text-[11px] text-muted-foreground/80">{aktuell.fachlich}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
