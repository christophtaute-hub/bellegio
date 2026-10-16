/**
 * Gibt je Einrichtung das Monatsergebnis (Förderung, Elternbeiträge, Personalkosten, Ergebnis) für die nächsten Monate aus —
 * dieselbe Berechnung wie Controlling/Dashboard (buildForecastMonths). Nur lesend, zum Nachrechnen der Demo-Daten.
 *
 *   npx tsx --env-file=.env.local scripts/ergebnis-pruefen.ts [Monate=6] [Bundesland=by]
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { buildForecastMonths } from "../lib/forecast/monthly-forecast";

const monate = Number(process.argv[2] ?? 6);
const land = process.argv[3] ?? "by";
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: einrichtungen } = await supabase
    .from("einrichtungen")
    .select("id, name, trager_id, bundesland_code")
    .eq("bundesland_code", land)
    .is("archived_at", null);
  const { data: traeger } = await supabase.from("trager").select("id, name");
  const euro = (n: number | null | undefined) => (n == null ? "–" : Math.round(n).toLocaleString("de-DE"));
  for (const e of einrichtungen ?? []) {
    const t = traeger?.find((x) => x.id === e.trager_id)?.name;
    const start = new Date();
    const von = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const reihe = await buildForecastMonths(supabase, e.id, von, monate, true);
    console.log(`\n${e.name} (${t})`);
    for (const m of reihe) {
      const f = m.finanzen!;
      const d = f.foerderung;
      console.log(
        `${m.month}  Kinder ${m.kpis.kinderGesamt}  Förd ${euro(f.foerdererloeseMonat)}` +
          (d ? ` (staatl ${euro(d.staatlichMonat)} komm ${euro(d.kommunalMonat)} Zusch ${euro(d.beitragszuschussMonat)})` : "") +
          `  Eltern ${euro(f.elternbeitraegeMonat)}  Personal ${euro(f.personalkostenMonat)}  Sonst ${euro(f.sonstigeKostenMonat)}  => ${euro(f.ergebnisMonat)}`
      );
    }
  }
}
main();
