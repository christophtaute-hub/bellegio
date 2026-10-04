import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";

export type AufgabenDaten = {
  nachrueckerOffen: number;
  austritteBald: number;
  verguetungFehlt: number | null;
  foerderbetragFehlt: boolean | null;
};

/** Lädt die wenigen Zähler, die für die Aufgabenliste zusätzlich zu den ohnehin berechneten Dashboard-Kennzahlen nötig
 * sind. Finanz-Zähler nur mit Finanzen-Recht (sonst null, dann zeigt die Aufgabenliste dazu nichts). */
export async function ladeAufgabenDaten(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  optionen: { zeigeFinanzen: boolean; bundeslandCode: string }
): Promise<AufgabenDaten> {
  const heute = toIsoDateString(new Date());
  const inDreiMonaten = toIsoDateString(addMonthsUtc(parseIsoDate(heute), 3));

  const [nachruecker, austritte] = await Promise.all([
    supabase
      .from("kinder")
      .select("id", { count: "exact", head: true })
      .eq("einrichtung_id", einrichtungId)
      .eq("status", "nachruecker")
      .is("archived_at", null),
    supabase
      .from("kinder")
      .select("id", { count: "exact", head: true })
      .eq("einrichtung_id", einrichtungId)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .gte("austritt", heute)
      .lte("austritt", inDreiMonaten),
  ]);

  let verguetungFehlt: number | null = null;
  let foerderbetragFehlt: boolean | null = null;
  if (optionen.zeigeFinanzen) {
    const [{ data: team }, { data: verguetung }, { data: einrichtung }] = await Promise.all([
      supabase.from("team").select("id").eq("einrichtung_id", einrichtungId).eq("status", "aktiv").is("archived_at", null),
      supabase
        .from("team_verguetung")
        .select("team_id, entgeltgruppe, stufe, monatsgehalt_manuell")
        .eq("einrichtung_id", einrichtungId),
      supabase.from("einrichtungen").select("foerderung_monatlich_manuell").eq("id", einrichtungId).single(),
    ]);
    const mitWert = new Set(
      (verguetung ?? [])
        .filter((v) => v.monatsgehalt_manuell !== null || (v.entgeltgruppe !== null && v.stufe !== null))
        .map((v) => v.team_id)
    );
    verguetungFehlt = (team ?? []).filter((t) => !mitWert.has(t.id)).length;
    if (optionen.bundeslandCode === "bw") foerderbetragFehlt = einrichtung?.foerderung_monatlich_manuell == null;
  }

  return {
    nachrueckerOffen: nachruecker.count ?? 0,
    austritteBald: austritte.count ?? 0,
    verguetungFehlt,
    foerderbetragFehlt,
  };
}
