import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/kita-datum";
import { ermittleLangzeitHinweise } from "@/lib/team/langzeithinweise";
import { AUSFALLZEIT_ART_LABEL } from "@/lib/constants";

/** Erinnerung an aktuell laufende Langzeitausfälle (Krankheit, Schwangerschaft, Mutterschutz) — damit sie bei der
 * Personalplanung nicht untergehen. Rein informativ, erscheint nur, wenn es etwas zu zeigen gibt. */
export async function PersonalHinweise({ einrichtungId, stichtag }: { einrichtungId: string; stichtag: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_ausfallzeiten")
    .select("art, von, bis, team!inner(id, vorname, nachname, einrichtung_id, status)")
    .eq("team.einrichtung_id", einrichtungId)
    .eq("team.status", "aktiv")
    .lte("von", stichtag)
    .or(`bis.is.null,bis.gte.${stichtag}`);

  const hinweise = ermittleLangzeitHinweise(
    (data ?? []).map((a) => ({
      teamId: a.team.id,
      name: [a.team.vorname, a.team.nachname].filter(Boolean).join(" "),
      art: a.art,
      von: a.von,
      bis: a.bis,
    })),
    stichtag
  );
  if (hinweise.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-500/10">
      <div className="flex items-center gap-2">
        <HeartPulse className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
        <h2 className="font-heading text-base text-amber-900 dark:text-amber-400">
          {hinweise.length === 1 ? "Ein Ausfall läuft gerade" : `${hinweise.length} Ausfälle laufen gerade`}
        </h2>
      </div>
      <ul className="flex flex-col gap-1 text-sm text-amber-900 dark:text-amber-200">
        {hinweise.map((h) => (
          <li key={`${h.teamId}-${h.von}`}>
            <Link href={`/team/${h.teamId}`} className="font-medium underline-offset-2 hover:underline">
              {h.name}
            </Link>{" "}
            — {AUSFALLZEIT_ART_LABEL[h.art]}, seit {formatDate(h.von)}
            {h.bis ? ` bis ${formatDate(h.bis)}` : " (ohne bekanntes Ende)"}
          </li>
        ))}
      </ul>
    </section>
  );
}
