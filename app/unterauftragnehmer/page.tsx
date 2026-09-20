import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { UNTERAUFTRAGNEHMER } from "@/lib/rechtstexte/unterauftragnehmer";
import { RechtstextSeite } from "@/components/legal/bausteine";
import { cn } from "cn";

export default async function UnterauftragnehmerPage() {
  const b = await ladeBetreiberOeffentlich(await createClient());

  return (
    <RechtstextSeite titel="Unterauftragnehmer" entwurf={!b.rechtstexte_geprueft} breit>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Dienstleister, die Bellegio bei der Verarbeitung von Kita-Daten einsetzt (Anlage zum{" "}
        <Link href="/avv" className="text-primary underline">Auftragsverarbeitungsvertrag</Link>). Noch nicht festgelegte Dienstleister sind als „vorgesehen“
        gekennzeichnet; die Liste wird vor dem Produktivstart vervollständigt.
      </p>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {UNTERAUFTRAGNEHMER.map((u) => (
          <li key={u.name} className="flex flex-col gap-1 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium">{u.name}</p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  u.eingesetzt
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                )}
              >
                {u.eingesetzt ? "eingesetzt" : "vorgesehen — noch nicht festgelegt"}
              </span>
            </div>
            <p>{u.leistung}</p>
            <p className="text-muted-foreground">Standort: {u.standort}</p>
            {u.hinweis ? <p className="text-muted-foreground">{u.hinweis}</p> : null}
          </li>
        ))}
      </ul>
    </RechtstextSeite>
  );
}
