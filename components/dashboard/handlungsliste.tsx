import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { HinweisLeiste } from "@/components/ui/hinweis-leiste";
import type { Handlung } from "@/lib/steuerung/handlungen";
import { cn } from "cn";

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

/** Die Handlungsliste als schmale Leiste: eine Zeile mit dem Wichtigsten, alle Hinweise öffnen sich im Dialog. Jede Zeile
 * führt direkt zum Datensatz (Kind, Gruppe, Person); Warnungen stehen oben. */
export function Handlungsliste({ handlungen }: { handlungen: Handlung[] }) {
  const warnungen = handlungen.filter((h) => h.ton === "warn").length;
  const wichtigste = handlungen[0];
  const zusammenfassung =
    handlungen.length === 0
      ? "Alles in Ordnung — in den nächsten Monaten ist nichts zu tun."
      : `${wichtigste.titel}${handlungen.length > 1 ? ` · und ${handlungen.length - 1} weitere` : ""}`;

  return (
    <HinweisLeiste
      titel="Was jetzt zu tun ist"
      beschreibung={warnungen > 0 ? `${warnungen} dringend, ${handlungen.length} insgesamt` : `${handlungen.length} insgesamt`}
      zusammenfassung={zusammenfassung}
      anzahl={handlungen.length}
      dringend={warnungen > 0}
    >
      <ul className="-mx-2 flex flex-col">
        {handlungen.map((h) => (
          <Zeile key={h.id} h={h} />
        ))}
      </ul>
    </HinweisLeiste>
  );
}
