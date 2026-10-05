"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

/** Schmale Hinweisleiste: eine Zeile mit Zusammenfassung und Anzahl, die Details öffnen sich im Dialog. Gedacht für alles,
 * was Hinweise gibt, aber die eigentliche Seite (Gruppen, Zahlen) nicht verdrängen soll.
 * Klicks auf Links im Dialog schließen ihn (auch bei Sprüngen innerhalb derselben Seite). `oeffneBeiHash` öffnet den
 * Dialog, wenn die Adresse mit diesem Anker aufgerufen wird (z. B. aus der Handlungsliste des Dashboards). */
export function HinweisLeiste({
  titel,
  beschreibung,
  zusammenfassung,
  anzahl,
  dringend = false,
  oeffneBeiHash,
  children,
}: {
  titel: string;
  beschreibung?: string;
  zusammenfassung: string;
  anzahl: number;
  dringend?: boolean;
  oeffneBeiHash?: string;
  children: React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    if (!oeffneBeiHash) return;
    const pruefe = () => {
      if (window.location.hash === `#${oeffneBeiHash}`) setOffen(true);
    };
    pruefe();
    window.addEventListener("hashchange", pruefe);
    return () => window.removeEventListener("hashchange", pruefe);
  }, [oeffneBeiHash]);

  const Icon = anzahl === 0 ? CheckCircle2 : dringend ? AlertTriangle : Info;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60 print:hidden",
          dringend ? "border-amber-300/70 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/20" : "bg-card"
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            anzahl === 0 ? "text-emerald-600" : dringend ? "text-amber-600 dark:text-amber-400" : "text-primary"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{zusammenfassung}</span>
        {anzahl > 0 ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              dringend ? "bg-amber-200/70 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100" : "bg-secondary text-secondary-foreground"
            )}
          >
            {anzahl} {anzahl === 1 ? "Hinweis" : "Hinweise"}
          </span>
        ) : null}
        <span className="flex shrink-0 items-center text-xs text-primary group-hover:underline">
          Ansehen
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto sm:max-w-2xl">
          <DialogTitle className="font-heading text-lg text-primary">{titel}</DialogTitle>
          {beschreibung ? <DialogDescription>{beschreibung}</DialogDescription> : null}
          <div
            className="flex flex-col gap-4"
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOffen(false);
            }}
          >
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
