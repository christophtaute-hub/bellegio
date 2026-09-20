import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { TOM, type TomStatus } from "@/lib/rechtstexte/tom";
import { Abschnitt, RechtstextSeite } from "@/components/legal/bausteine";
import { cn } from "cn";

const STATUS_KLASSE: Record<TomStatus, string> = {
  umgesetzt: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  "mit Produktivstart": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  "Betreiber ergänzt": "bg-secondary text-secondary-foreground",
};

export default async function TomPage() {
  const b = await ladeBetreiberOeffentlich(await createClient());

  return (
    <RechtstextSeite titel="Sicherheit: technische und organisatorische Maßnahmen" entwurf={!b.rechtstexte_geprueft} breit>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Maßnahmen nach Art. 32 DSGVO, die Bellegio zum Schutz der Kita-Daten einsetzt. Sie sind Anlage zum{" "}
        <Link href="/avv" className="text-primary underline">Auftragsverarbeitungsvertrag</Link>. Jede Zeile nennt ehrlich, ob die Maßnahme bereits im Programm
        umgesetzt ist, mit dem Produktivstart kommt oder vom Betreiber organisatorisch ergänzt wird.
      </p>
      {TOM.map((gruppe) => (
        <Abschnitt key={gruppe.titel} titel={gruppe.titel}>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {gruppe.massnahmen.map((m) => (
              <li key={m.titel} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="font-medium">{m.titel}</p>
                  <p className="text-muted-foreground">{m.text}</p>
                </div>
                <span className={cn("w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_KLASSE[m.status])}>{m.status}</span>
              </li>
            ))}
          </ul>
        </Abschnitt>
      ))}
    </RechtstextSeite>
  );
}
