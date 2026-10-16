"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { BerechnenLeiste } from "@/components/szenario/berechnen-leiste";
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
  const [sonstige, setSonstige] = useState(String(gespeichert?.sonstigeKostenMonat ?? eingabe.finanz?.sonstigeKostenVorbelegt ?? 0));
  const [istPending, starte] = useTransition();

  // Annahmen (live editierbar) und berechneter Stand (ändert sich nur per Klick auf „Jetzt berechnen“)
  const daten: PlanungDaten = useMemo(
    () => ({
      kinder: Object.fromEntries(Object.entries(kinder).map(([id, v]) => [id, Number(v) || 0])),
      einstellenGeplant: Number(einstellen) || 0,
      ...(eingabe.finanz ? { sonstigeKostenMonat: Number(sonstige) || 0 } : {}),
    }),
    [kinder, einstellen, sonstige, eingabe.finanz]
  );
  const [berechnet, setBerechnet] = useState<PlanungDaten | null>(gespeichert ? daten : null);
  const veraltet = berechnet !== null && JSON.stringify(berechnet) !== JSON.stringify(daten);
  const e = useMemo(() => (berechnet ? berechnePlanung(eingabe, berechnet) : null), [eingabe, berechnet]);
  const SatzIcon = e ? (e.satz.ton === "ok" ? CheckCircle2 : e.satz.ton === "info" ? Info : AlertTriangle) : Info;
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
      setSonstige(String(eingabe.finanz?.sonstigeKostenVorbelegt ?? 0));
      setBerechnet(null);
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

      {/* 1. Annahmen */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <h3 className="font-heading text-lg text-primary">1. Deine Annahmen</h3>
        <p className="-mt-2 text-sm text-muted-foreground">Wie viele Kinder planst du je Gruppe? Der Vorschlag kommt aus Austritten, Schuleintritten und Nachrückern.</p>
        <ul className="flex flex-col divide-y">
          {eingabe.gruppen.map((g) => {
            const geaendert = Number(kinder[g.id]) !== g.vorschlagKinder;
            return (
              <li key={g.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Vorjahr {g.vorjahrKinder} · {g.sollplaetze} Plätze
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-20 text-right tabular-nums"
                    value={kinder[g.id]}
                    disabled={!darfBearbeiten}
                    onChange={(ev) => setKinder((alt) => ({ ...alt, [g.id]: ev.target.value }))}
                    aria-label={`Geplante Kinder in ${g.name}`}
                  />
                  <span className="mt-0.5 text-[11px] text-muted-foreground">{geaendert ? `Vorschlag: ${g.vorschlagKinder}` : "Vorschlag"}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="einstellen" className="text-sm text-muted-foreground">
              Geplante Einstellungen oder Aufstockungen (Wochenstunden)
            </label>
            <Input id="einstellen" type="number" min={0} className="h-9 w-32 tabular-nums" value={einstellen} disabled={!darfBearbeiten} onChange={(ev) => setEinstellen(ev.target.value)} />
          </div>
          {eingabe.finanz ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sonstige" className="text-sm text-muted-foreground">
                Sonstige Kosten pro Monat (Miete, Verpflegung, Sachkosten)
              </label>
              <Input id="sonstige" type="number" min={0} step="50" className="h-9 w-32 tabular-nums" value={sonstige} disabled={!darfBearbeiten} onChange={(ev) => setSonstige(ev.target.value)} />
            </div>
          ) : null}
        </div>
        <BerechnenLeiste berechnet={berechnet !== null} veraltet={veraltet} onBerechnen={() => setBerechnet(daten)} />
      </div>

      {/* 2. Ergebnis */}
      {e ? (
        <div className={cn("flex flex-col gap-4 rounded-2xl border-2 border-primary/30 bg-card p-5 transition-opacity", veraltet && "opacity-50")} aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-lg text-primary">2. Ergebnis deiner Planung</h3>
            <AmpelBadge ampel={e.ampel} />
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kennzahl label="Geplante Kinder" wert={`${e.summe.plan} von ${e.summe.plaetze} Plätzen`} />
            <Kennzahl label="Gruppen" wert={String(e.gruppenAnzahl)} />
            <Kennzahl label="Personalbedarf" wert={`${Math.round(e.sollPlan).toLocaleString("de-DE")} Std.`} klein={`vorhanden: ${Math.round(e.personalIst).toLocaleString("de-DE")} Std.`} />
            <Kennzahl
              label="Einstellen"
              wert={e.einstellenStunden > 0 ? `${e.einstellenStunden.toLocaleString("de-DE")} Std.` : "nichts"}
              klein={e.einstellenStunden > 0 ? stellenText(e.einstellenStunden, v) : e.luecke >= 1 ? "Lücke ist gedeckt" : undefined}
            />
          </div>

          {e.finanzen ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kennzahl label="Förderung & Elternbeiträge" wert={`${euro(e.finanzen.einnahmen)} / Monat`} klein="Ø je Kind aus dem Vorschlag" />
              <Kennzahl label="Personalkosten" wert={`${euro(e.finanzen.personalkosten)} / Monat`} />
              <Kennzahl label="Sonstige Kosten" wert={`${euro(e.finanzen.sonstigeKosten)} / Monat`} />
              <Kennzahl
                label="Erwartetes Ergebnis"
                wert={`${e.finanzen.ergebnis > 0 ? "+" : ""}${euro(e.finanzen.ergebnis)} / Monat`}
                ton={e.finanzen.ergebnis >= 0 ? "plus" : "minus"}
              />
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Gruppe</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Vorjahr</th>
                  <th className="px-3 py-2 text-right font-medium">Geplant</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Veränderung</th>
                  <th className="px-4 py-2 font-medium">Stand</th>
                </tr>
              </thead>
              <tbody>
                {e.zeilen.map((z) => (
                  <tr key={z.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{z.name}</td>
                    <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{z.vorjahr}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {z.plan} / {z.plaetze}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{z.delta > 0 ? `+${z.delta}` : z.delta}</td>
                    <td className={cn("px-4 py-2 text-xs font-medium", STATUS_KLASSE[z.status])}>{STATUS_WORT[z.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {e.bedarfOhneKinderbezug ? (
            <p className="text-xs text-muted-foreground">In diesem Bundesland hängt der Bedarf an Gruppenform bzw. Betriebsform und Buchungszeit — die Kinderzahl ändert ihn nicht.</p>
          ) : null}
          {e.finanzen ? (
            <p className="text-xs text-muted-foreground">
              Förderung und Elternbeiträge sind eine Schätzung (Ø je Kind aus dem Vorschlag × geplante Kinder); Personalkosten = heutiges Team nach bekannten Austritten plus geplante Einstellungen
              {kostenJeWochenstunde !== null ? ` (${euro(kostenJeWochenstunde)} je Wochenstunde)` : ""}. Verpflegung und Pflegemittel sind nicht enthalten.
            </p>
          ) : null}
        </div>
      ) : null}

      {darfBearbeiten ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={speichern} disabled={istPending}>
            Planung speichern
          </Button>
          <Button variant="ghost" onClick={zuruecksetzen} disabled={istPending}>
            Auf Vorschlag zurücksetzen
          </Button>
          {gespeichertAm ? <span className="text-xs text-muted-foreground">Zuletzt gespeichert am {new Date(gespeichertAm).toLocaleDateString("de-DE")}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function Kennzahl({ label, wert, klein, ton }: { label: string; wert: string; klein?: string; ton?: "plus" | "minus" }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", ton === "plus" && "text-emerald-700 dark:text-emerald-400", ton === "minus" && "text-destructive")}>{wert}</span>
      {klein ? <span className="text-xs text-muted-foreground">{klein}</span> : null}
    </div>
  );
}
