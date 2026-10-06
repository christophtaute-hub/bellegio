"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { berechnePlanung, type PlanungDaten, type PlanungEingabe } from "@/lib/planung/kitajahr";
import { speichereKitajahrPlanung, verwerfeKitajahrPlanung } from "@/lib/actions/kitajahr-planung";
import { meldeErfolg, meldeFehler } from "@/lib/toast";
import { stellenText } from "@/lib/ui/status";
import { cn } from "cn";

const STATUS_WORT = { ok: "In Ordnung", voll: "Voll", frei: "Plätze frei", zuviel: "Überbelegt" } as const;
const STATUS_KLASSE = {
  ok: "text-emerald-700 dark:text-emerald-400",
  voll: "text-emerald-700 dark:text-emerald-400",
  frei: "text-muted-foreground",
  zuviel: "text-destructive",
} as const;

const euro = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const datum = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" });

/** Kitajahr planen: je Gruppe Vorjahr, Vorschlag und eigene Planzahl; darunter, wie viel Personal fehlt oder übrig ist. Der Vorschlag
 * kommt aus den bekannten Austritten, Schuleintritten, festen Nachfolgern und geplanten Wechseln — alles lässt sich ändern. */
export function KitajahrPlanung({
  einrichtungId,
  kitajahrStart,
  kitajahrLabel,
  auswahl,
  eingabe,
  gespeichert,
  gespeichertAm,
  kostenJeWochenstunde,
  darfBearbeiten,
}: {
  einrichtungId: string;
  kitajahrStart: string;
  kitajahrLabel: string;
  auswahl: { jahr: number; label: string; aktiv: boolean }[];
  eingabe: PlanungEingabe;
  gespeichert: PlanungDaten | null;
  gespeichertAm: string | null;
  kostenJeWochenstunde: number | null;
  darfBearbeiten: boolean;
}) {
  const [kinder, setKinder] = useState<Record<string, string>>(() =>
    Object.fromEntries(eingabe.gruppen.map((g) => [g.id, String(gespeichert?.kinder?.[g.id] ?? g.vorschlagKinder)]))
  );
  const [einstellen, setEinstellen] = useState(String(gespeichert?.einstellenGeplant ?? 0));
  const [istPending, starte] = useTransition();

  const daten: PlanungDaten = useMemo(
    () => ({ kinder: Object.fromEntries(Object.entries(kinder).map(([id, v]) => [id, Number(v) || 0])), einstellenGeplant: Number(einstellen) || 0 }),
    [kinder, einstellen]
  );
  const e = useMemo(() => berechnePlanung(eingabe, daten), [eingabe, daten]);
  const SatzIcon = e.satz.ton === "ok" ? CheckCircle2 : e.satz.ton === "info" ? Info : AlertTriangle;
  const v = eingabe.vollzeitWochenstunden;

  function speichern() {
    starte(async () => {
      const r = await speichereKitajahrPlanung(einrichtungId, kitajahrStart, daten);
      if (r.ok) meldeErfolg("Planung gespeichert.");
      else meldeFehler(r.error);
    });
  }
  function zuruecksetzen() {
    starte(async () => {
      const r = await verwerfeKitajahrPlanung(einrichtungId, kitajahrStart);
      if (!r.ok) return meldeFehler(r.error);
      setKinder(Object.fromEntries(eingabe.gruppen.map((g) => [g.id, String(g.vorschlagKinder)])));
      setEinstellen("0");
      meldeErfolg("Vorschlag wiederhergestellt.");
    });
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="planung-titel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="planung-titel" className="font-heading text-xl text-primary">
            Kitajahr {kitajahrLabel}
          </h2>
          <p className="text-sm text-muted-foreground">Start am {datum(kitajahrStart)}. Wie viele Kinder kommen, und reicht das Personal?</p>
        </div>
        <nav className="flex items-center gap-0.5 rounded-full border bg-secondary/40 p-0.5" aria-label="Kitajahr">
          {auswahl.map((a) => (
            <Link
              key={a.jahr}
              href={`/szenario?reiter=planen&jahr=${a.jahr}`}
              aria-current={a.aktiv ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm tabular-nums transition-colors",
                a.aktiv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>

      <p
        className={cn(
          "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-medium",
          e.satz.ton === "ok" && "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
          e.satz.ton === "info" && "bg-sky-500/10 text-sky-900 dark:text-sky-200",
          e.satz.ton === "warnung" && "bg-destructive/10 text-destructive"
        )}
      >
        <SatzIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        {e.satz.text}
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Gruppe</th>
              <th className="px-3 py-2.5 text-right font-medium">Vorjahr</th>
              <th className="px-3 py-2.5 text-right font-medium">Geplant</th>
              <th className="px-3 py-2.5 text-right font-medium">Plätze</th>
              <th className="px-3 py-2.5 text-right font-medium">Veränderung</th>
              <th className="px-4 py-2.5 font-medium">Stand</th>
            </tr>
          </thead>
          <tbody>
            {e.zeilen.map((z, i) => {
              const g = eingabe.gruppen[i];
              const geaendert = z.plan !== g.vorschlagKinder;
              return (
                <tr key={z.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{z.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{z.vorjahr}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Input
                      type="number"
                      min={0}
                      className="ml-auto h-8 w-20 text-right tabular-nums"
                      value={kinder[z.id]}
                      disabled={!darfBearbeiten}
                      onChange={(ev) => setKinder((alt) => ({ ...alt, [z.id]: ev.target.value }))}
                      aria-label={`Geplante Kinder in ${z.name}`}
                    />
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{geaendert ? `Vorschlag: ${g.vorschlagKinder}` : "Vorschlag"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{z.plaetze}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", z.delta < 0 ? "text-muted-foreground" : "")}>{z.delta > 0 ? `+${z.delta}` : z.delta}</td>
                  <td className={cn("px-4 py-2.5 text-xs font-medium", STATUS_KLASSE[z.status])}>{STATUS_WORT[z.status]}</td>
                </tr>
              );
            })}
            <tr className="bg-secondary/40 font-semibold">
              <td className="px-4 py-2.5">Gesamt</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{e.summe.vorjahr}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{e.summe.plan}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{e.summe.plaetze}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{e.summe.plan - e.summe.vorjahr > 0 ? "+" : ""}{e.summe.plan - e.summe.vorjahr}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-secondary/40 p-5">
          <p className="text-sm text-muted-foreground">Personal zum Start</p>
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(e.personalIst).toLocaleString("de-DE")}
            <span className="text-base font-normal text-muted-foreground"> von {Math.round(e.sollPlan).toLocaleString("de-DE")} nötigen Wochenstunden</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Vorhanden ist das Personal nach allen bekannten Austritten.
            {e.bedarfOhneKinderbezug ? " In diesem Bundesland hängt der Bedarf an Gruppenform bzw. Betriebsform und Buchungszeit — die Kinderzahl ändert ihn nicht." : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-secondary/40 p-5">
          <label htmlFor="einstellen" className="text-sm text-muted-foreground">
            Geplante Einstellungen oder Aufstockungen (Wochenstunden)
          </label>
          <Input id="einstellen" type="number" min={0} className="h-9 w-32 tabular-nums" value={einstellen} disabled={!darfBearbeiten} onChange={(ev) => setEinstellen(ev.target.value)} />
          <p className="text-sm">
            {e.luecke >= 1 ? (
              e.einstellenStunden > 0 ? (
                <>
                  <span className="font-semibold">Einstellen: {e.einstellenStunden.toLocaleString("de-DE")} Std.</span> ({stellenText(e.einstellenStunden, v)})
                </>
              ) : (
                "Die Lücke ist gedeckt."
              )
            ) : (
              "Es muss niemand eingestellt werden."
            )}
            {kostenJeWochenstunde !== null && e.einstellenStunden > 0 ? (
              <span className="block text-xs text-muted-foreground">Das kostet etwa {euro(kostenJeWochenstunde * e.einstellenStunden)} im Monat (Ø Kosten deines Teams inkl. Nebenkosten).</span>
            ) : null}
          </p>
        </div>
      </div>

      {darfBearbeiten ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={speichern} disabled={istPending}>
            Planung speichern
          </Button>
          <Button variant="outline" onClick={zuruecksetzen} disabled={istPending}>
            Vorschlag neu berechnen
          </Button>
          {gespeichertAm ? <span className="text-xs text-muted-foreground">Zuletzt gespeichert am {new Date(gespeichertAm).toLocaleDateString("de-DE")}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
