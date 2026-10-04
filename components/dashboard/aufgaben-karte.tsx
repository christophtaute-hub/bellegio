import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Aufgabe, AufgabenGruppe } from "@/lib/dashboard/aufgaben";

const GRUPPEN: AufgabenGruppe[] = ["Belegung", "Personal", "Daten"];

/** "Aufgaben"-Karte im Stil des Lexware-Dashboards: gruppierte Liste dessen, was Aufmerksamkeit braucht, jeweils mit Link
 * zur passenden Seite. Ohne offene Punkte steht dort eine ruhige Bestätigung statt einer leeren Karte. */
export function AufgabenKarte({ aufgaben }: { aufgaben: Aufgabe[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <h2 className="font-heading text-lg text-primary">Aufgaben</h2>
      {aufgaben.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          Alles in Ordnung — keine offenen Punkte.
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          {GRUPPEN.map((gruppe) => {
            const zeilen = aufgaben.filter((a) => a.gruppe === gruppe);
            if (zeilen.length === 0) return null;
            return (
              <div key={gruppe} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{gruppe}</h3>
                {zeilen.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className={`flex items-start gap-2 text-sm hover:underline ${a.ton === "warn" ? "text-amber-700 dark:text-amber-400" : "text-primary"}`}
                  >
                    {a.ton === "warn" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    ) : (
                      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                    <span>{a.text}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
