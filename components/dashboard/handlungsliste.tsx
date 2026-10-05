import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import type { Handlung } from "@/lib/steuerung/handlungen";
import { cn } from "cn";

const SICHTBAR = 7;

function monatKurz(iso: string): string {
  const [jahr, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "short", year: "numeric", timeZone: "UTC" });
}

function Zeile({ h }: { h: Handlung }) {
  const warn = h.ton === "warn";
  return (
    <li>
      <Link
        href={h.href}
        className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/60"
      >
        {warn ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-sm font-medium", warn && "text-amber-900 dark:text-amber-300")}>{h.titel}</span>
          {h.grund ? <span className="text-xs text-muted-foreground">{h.grund}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {h.wann ? <span className="hidden tabular-nums sm:inline">{monatKurz(h.wann)}</span> : null}
          <span className="flex items-center gap-1 text-primary group-hover:underline">
            {h.aktion}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Die Handlungsliste: was ist das Problem, warum, und wohin muss ich klicken. Jede Zeile führt direkt zum Datensatz
 * (Kind, Gruppe, Person). Warnungen stehen oben; mehr als sieben Zeilen klappen auf. */
export function Handlungsliste({ handlungen }: { handlungen: Handlung[] }) {
  const sichtbar = handlungen.slice(0, SICHTBAR);
  const rest = handlungen.slice(SICHTBAR);
  const warnungen = handlungen.filter((h) => h.ton === "warn").length;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4 md:p-5" aria-labelledby="handlungen-titel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3">
        <h2 id="handlungen-titel" className="font-heading text-lg text-primary">
          Was jetzt zu tun ist
        </h2>
        {handlungen.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {warnungen > 0 ? `${warnungen} dringend, ` : ""}
            {handlungen.length} insgesamt
          </p>
        ) : null}
      </div>
      {handlungen.length === 0 ? (
        <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          Alles in Ordnung — in den nächsten Monaten ist nichts zu tun.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">{sichtbar.map((h) => <Zeile key={h.id} h={h} />)}</ul>
          {rest.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer list-none px-3 py-1.5 text-sm text-primary hover:underline">
                <span className="group-open:hidden">Weitere {rest.length} anzeigen</span>
                <span className="hidden group-open:inline">Weniger anzeigen</span>
              </summary>
              <ul className="flex flex-col">{rest.map((h) => <Zeile key={h.id} h={h} />)}</ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
