"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Bar, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Ring } from "@/components/dashboard/ring";
import type { CockpitDaten, GeldKarte, MonatsStatus } from "@/lib/steuerung/cockpit";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { cn } from "cn";

const ZEITRAEUME = [3, 6, 9, 12, 18, 24] as const;

const PUNKT_HEX: Record<MonatsStatus, string> = { ok: "#10b981", knapp: "#f59e0b", fehlt: "#dc2626", ueberhang: "#0ea5e9" };
const WORT: Record<MonatsStatus, string> = { ok: "In Ordnung", knapp: "Knapp", fehlt: "Zu wenig Personal", ueberhang: "Mehr Personal als nötig" };
const WORT_KLASSE: Record<MonatsStatus, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  knapp: "text-amber-700 dark:text-amber-400",
  fehlt: "text-destructive",
  ueberhang: "text-sky-700 dark:text-sky-400",
};

/** Ist und Soll nebeneinander, dazu der Unterschied — damit auf einen Blick klar ist, wie weit man vom Soll entfernt ist. */
function IstSoll({ ist, soll, einheit, titel }: { ist: number; soll: number; einheit: string; titel?: string }) {
  const diff = ist - soll;
  const fmt = (n: number) => n.toLocaleString("de-DE");
  return (
    <div className="flex flex-col gap-0.5">
      {titel ? <span className="text-xs font-medium">{titel}</span> : null}
      <div className="flex items-baseline gap-4">
        <span className="flex flex-col">
          <span className="text-xl font-semibold tabular-nums leading-tight">{fmt(ist)}</span>
          <span className="text-[11px] text-muted-foreground">Ist</span>
        </span>
        <span className="flex flex-col">
          <span className="text-xl font-semibold tabular-nums leading-tight text-muted-foreground">{fmt(soll)}</span>
          <span className="text-[11px] text-muted-foreground">Soll</span>
        </span>
        <span className="flex flex-col">
          <span className={cn("text-xl font-semibold tabular-nums leading-tight", diff < 0 ? "text-destructive" : diff > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
            {diff > 0 ? "+" : ""}
            {fmt(diff)}
          </span>
          <span className="text-[11px] text-muted-foreground">Unterschied</span>
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground">{einheit}</span>
    </div>
  );
}

const GESETZ_KLASSE: Record<Ampel, string> = {
  gruen: "text-emerald-700 dark:text-emerald-400",
  gelb: "text-amber-700 dark:text-amber-400",
  rot: "text-destructive",
};
const GESETZ_FUELLUNG: Record<Ampel, string> = { gruen: "bg-emerald-500", gelb: "bg-amber-500", rot: "bg-destructive" };

const euroGanz = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
function kurzEuro(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })}T€`;
  return `${Math.round(n)}€`;
}

/** Messbalken: wie nah ist das Personal an der gesetzlichen Grenze? Der Strich in der Mitte ist die Grenze — links davon ist alles in Ordnung. */
function GrenzBalken({ anteil, ton }: { anteil: number; ton: Ampel }) {
  const skala = 1.5;
  const breite = Math.min(100, Math.max(2, (anteil / skala) * 100));
  const grenze = (1 / skala) * 100;
  return (
    <div className="flex flex-col gap-1" role="img" aria-label={`Abstand zur gesetzlichen Grenze: ${Math.round(anteil * 100)} Prozent der Grenze`}>
      <div className="relative h-2.5 w-full rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-[width] duration-500", GESETZ_FUELLUNG[ton])} style={{ width: `${breite}%` }} />
        <div className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground" style={{ left: `${grenze}%` }} aria-hidden />
      </div>
      <div className="relative h-3 text-[10px] text-muted-foreground">
        <span className="absolute -translate-x-1/2" style={{ left: `${grenze}%` }}>
          Grenze
        </span>
      </div>
    </div>
  );
}

/** „Plus oder Minus?“ — die Antwort zuerst, darunter die zwei Zahlen, aus denen sie entsteht. */
function GeldKarteAnsicht({ geld }: { geld: GeldKarte }) {
  const klasse = geld.ton === "plus" ? "text-emerald-700 dark:text-emerald-400" : geld.ton === "minus" ? "text-destructive" : "text-foreground";
  const vorzeichen = geld.ergebnis > 0 ? "+" : "";
  return (
    <Link
      href="/controlling"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-2xl p-5 transition-colors",
        geld.ton === "minus" ? "bg-destructive/10 hover:bg-destructive/15" : geld.ton === "plus" ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "bg-secondary/40 hover:bg-secondary/70"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">Deckt die Förderung das Personal?</span>
        <span className={cn("text-2xl font-semibold leading-tight", klasse)}>{geld.wort}</span>
        <span className={cn("text-xl font-semibold tabular-nums", klasse)}>
          {vorzeichen}
          {euroGanz(geld.ergebnis)} <span className="text-sm font-normal text-muted-foreground">im Monat</span>
        </span>
      </div>
      <div className="flex gap-6">
        <span className="flex flex-col">
          <span className="text-lg font-semibold tabular-nums">{euroGanz(geld.einnahmen)}</span>
          <span className="text-[11px] text-muted-foreground">{geld.elternbeitraege !== null ? "Förderung + Elternbeiträge" : "Förderung"}</span>
        </span>
        <span className="flex flex-col">
          <span className="text-lg font-semibold tabular-nums">{euroGanz(geld.personalkosten)}</span>
          <span className="text-[11px] text-muted-foreground">Personalkosten</span>
        </span>
      </div>
      <p className="w-full text-[11px] text-muted-foreground/80">
        Förderung{geld.elternbeitraege !== null ? " und Elternbeiträge (laut eurer Preisliste)" : ""} minus Personalkosten. Sachkosten und kommunaler Anteil fehlen — das ist kein Jahresabschluss.
        {geld.nichtErfasst > 0 ? ` Bei ${geld.nichtErfasst} Mitarbeitenden fehlt die Vergütung, die Personalkosten sind deshalb zu niedrig.` : ""}
      </p>
    </Link>
  );
}

type DiagrammPunkt = {
  label: string;
  kinder: number;
  plaetze: number;
  personalIst: number;
  personalSoll: number;
  status: MonatsStatus;
  ergebnis: number | null;
};

/** Ein einfaches Balkendiagramm: Balken = Ist, gestrichelte Stufe = Soll. Klick/Tipp wählt den Monat. */
function DiagrammKarte({
  titel,
  hinweis,
  daten,
  wertKey,
  sollKey,
  gewaehlt,
  onWahl,
  farbe,
  euro,
}: {
  titel: string;
  hinweis: string;
  daten: DiagrammPunkt[];
  wertKey: "kinder" | "personalIst" | "ergebnis";
  sollKey?: "plaetze" | "personalSoll";
  gewaehlt: number;
  onWahl: (i: number) => void;
  farbe: (d: DiagrammPunkt) => string;
  /** Beträge in Euro (Balken dürfen unter null gehen). */
  euro?: boolean;
}) {
  const werte = daten.map((d) => d[wertKey] ?? 0);
  const hoechst = Math.max(1, ...werte, ...(sollKey ? daten.map((d) => d[sollKey]) : []));
  const tiefst = euro ? Math.min(0, ...werte) : 0;
  // Euro-Beträge sind lang: nur bei wenigen Balken beschriften, sonst steht der Wert des gewählten Monats in der Detailkarte.
  const beschriftet = daten.length <= (euro ? 6 : 12);
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-secondary/40 p-4">
      <p className="text-sm font-semibold">{titel}</p>
      <p className="text-[11px] text-muted-foreground">{hinweis}</p>
      <div className="h-48 w-full" role="img" aria-label={`${titel} je Monat: ${hinweis}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={daten}
            margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
            barCategoryGap="18%"
            onClick={(e) => {
              const index = (e as { activeTooltipIndex?: number } | null)?.activeTooltipIndex;
              if (typeof index === "number") onWahl(index);
            }}
          >
            <XAxis dataKey="label" tickFormatter={(l: string) => l.split(" ")[0].replace(".", "")} tickLine={false} axisLine={false} interval={daten.length > 12 ? 2 : 0} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis hide domain={[tiefst < 0 ? tiefst * 1.2 : 0, Math.ceil(hoechst * 1.15)]} />
            <Bar dataKey={wertKey} radius={[6, 6, 0, 0]} isAnimationActive={false} cursor="pointer">
              {daten.map((d, i) => (
                <Cell key={i} fill={farbe(d)} fillOpacity={i === gewaehlt ? 1 : 0.55} />
              ))}
              {beschriftet ? <LabelList dataKey={wertKey} position="top" fontSize={10} fill="var(--muted-foreground)" formatter={euro ? (v: unknown) => kurzEuro(Number(v)) : undefined} /> : null}
            </Bar>
            {sollKey ? <Line type="stepAfter" dataKey={sollKey} stroke="var(--foreground)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} /> : null}
            {euro ? <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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

  const daten: DiagrammPunkt[] = reihe.map((m, i) => ({
    ergebnis: m.ergebnis,
    label: i === 0 ? jetztLabel : m.label,
    kinder: m.kinder,
    plaetze: m.plaetze,
    personalIst: m.personalIst,
    personalSoll: m.personalSoll,
    status: m.status,
  }));

  const kinderProzent = jetzt.plaetze > 0 ? Math.round((jetzt.kinder / jetzt.plaetze) * 100) : 0;
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
            <span className="flex items-baseline text-4xl font-semibold tabular-nums leading-none">
              {kinderProzent}
              <span className="ml-0.5 text-xl font-medium text-muted-foreground">%</span>
            </span>
            <span className="mt-1 text-xs text-muted-foreground">belegt</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">Kinder</span>
              <span className={cn("text-lg font-semibold", jetzt.belegungTon === "zuviel" && "text-destructive")}>{jetzt.belegungWort}</span>
            </div>
            <IstSoll ist={jetzt.kinder} soll={jetzt.plaetze} einheit="Plätze" />
          </div>
        </Link>

        <Link href="/team" className="flex items-center gap-5 rounded-2xl bg-secondary/40 p-5 transition-colors hover:bg-secondary/70">
          <Ring anteil={jetzt.personalProzent / 100} farbe={personalFarbe} beschreibung={`Personal: ${jetzt.personalProzent} Prozent des nötigen`}>
            <span className="flex items-baseline text-4xl font-semibold tabular-nums leading-none">
              {jetzt.personalProzent}
              <span className="ml-0.5 text-xl font-medium text-muted-foreground">%</span>
            </span>
            <span className="mt-1 text-xs text-muted-foreground">vom Bedarf</span>
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm text-muted-foreground">Passt das Personal zum Gesetz?</span>
            <span className={cn("text-lg font-semibold leading-snug", GESETZ_KLASSE[jetzt.gesetz.ton])}>{jetzt.gesetz.wort}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-semibold leading-tight">{jetzt.gesetz.ist}</span>
              <span className="text-sm text-muted-foreground">{jetzt.gesetz.vorgabe}</span>
            </div>
            <GrenzBalken anteil={jetzt.gesetz.anteil} ton={jetzt.gesetz.ton} />
            <span className="text-[11px] text-muted-foreground/80">
              {jetzt.fachKennzahl.label}: {jetzt.fachKennzahl.value} · {jetzt.personalIst.toLocaleString("de-DE")} von {jetzt.personalSoll.toLocaleString("de-DE")} Wochenstunden
            </span>
          </div>
        </Link>
      </div>

      {cockpit.geld ? <GeldKarteAnsicht geld={cockpit.geld} /> : null}

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

      <div className="flex flex-col gap-4">
        <div className={cn("grid gap-4 lg:grid-cols-2", cockpit.geld && "xl:grid-cols-3")}>
          <DiagrammKarte
            titel="Kinder"
            hinweis="Balken: Kinder je Monat · gestrichelt: Plätze"
            daten={daten}
            wertKey="kinder"
            sollKey="plaetze"
            gewaehlt={gewaehlt}
            onWahl={setGewaehlt}
            farbe={(d) => (d.kinder > d.plaetze ? "#dc2626" : "#0f766e")}
          />
          <DiagrammKarte
            titel="Personal"
            hinweis="Balken: Wochenstunden vorhanden · gestrichelt: nötig"
            daten={daten}
            wertKey="personalIst"
            sollKey="personalSoll"
            gewaehlt={gewaehlt}
            onWahl={setGewaehlt}
            farbe={(d) => PUNKT_HEX[d.status]}
          />
          {cockpit.geld ? (
            <DiagrammKarte
              titel="Plus oder Minus"
              hinweis="Balken: Förderung (und Beiträge) minus Personal je Monat"
              daten={daten}
              wertKey="ergebnis"
              gewaehlt={gewaehlt}
              onWahl={setGewaehlt}
              farbe={(d) => ((d.ergebnis ?? 0) >= 0 ? "#10b981" : "#dc2626")}
              euro
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Rot = zu wenig Personal bzw. überbelegt · gelb = knapp · blau = mehr Personal als nötig · grün = in Ordnung. Auf einen Balken tippen für Details.
        </p>

        {aktuell ? (
          <div className="flex flex-col gap-1 rounded-2xl border p-4" aria-live="polite">
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-semibold">{gewaehlt === 0 ? jetztLabel : aktuell.label}</span>
              <span className={cn("font-medium", WORT_KLASSE[aktuell.status])}>· {WORT[aktuell.status]}</span>
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 py-1">
              <IstSoll ist={aktuell.kinder} soll={aktuell.plaetze} einheit="Plätze" titel="Kinder" />
              <IstSoll ist={aktuell.personalIst} soll={aktuell.personalSoll} einheit="Wochenstunden" titel="Personal" />
            </div>
            {aktuell.gesetz ? (
              <p className="text-sm">
                <span className="font-medium">Gesetz:</span> {aktuell.gesetz.ist} — {aktuell.gesetz.vorgabe}
              </p>
            ) : null}
            {aktuell.ergebnis !== null ? (
              <p className="text-sm">
                <span className="font-medium">Ergebnis:</span>{" "}
                <span className={aktuell.ergebnis < 0 ? "font-semibold text-destructive" : "font-semibold text-emerald-700 dark:text-emerald-400"}>
                  {aktuell.ergebnis > 0 ? "+" : ""}
                  {euroGanz(aktuell.ergebnis)}
                </span>{" "}
                in diesem Monat
              </p>
            ) : null}
            <p className="text-sm">{aktuell.text}</p>
            {aktuell.ereignisse.length > 0 ? <p className="text-sm text-muted-foreground">{aktuell.ereignisse.join(" · ")}</p> : null}
            <p className="text-[11px] text-muted-foreground/80">{aktuell.fachlich}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
