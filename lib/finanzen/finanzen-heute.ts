import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PresenceRow } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth } from "@/lib/team/anstellungsschluessel";
import { ladeFinanzenBasis, resolveFinanzenMonat } from "@/lib/forecast/monthly-forecast";
import type { Ergebnis } from "@/lib/finanzen/ergebnis";

/** Fördererlöse, Personalkosten und Ergebnis einer Einrichtung für einen Stichtag — dieselbe Berechnung wie im Controlling
 * (ladeFinanzenBasis/resolveFinanzenMonat), nur für einen einzelnen Monat. Nur aufrufen, wenn der Nutzer das Finanzen-Recht hat. */
export async function ladeFinanzenHeute(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string,
  kinderRows: PresenceRow[]
): Promise<Ergebnis | null> {
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code, vollzeit_wochenstunden")
    .eq("id", einrichtungId)
    .single();
  if (!einrichtung) return null;

  const nrwGruppenById = new Map<string, { nrwGruppenform: string | null; nrwBuchungszeitStunden: number | null }>();
  if (einrichtung.bundesland_code === "nrw") {
    const { data: gruppen } = await supabase
      .from("gruppen")
      .select("id, nrw_gruppenform, nrw_buchungszeit_stunden")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null);
    for (const g of gruppen ?? []) {
      nrwGruppenById.set(g.id, { nrwGruppenform: g.nrw_gruppenform, nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden });
    }
  }

  const [basis, teamRows] = await Promise.all([
    ladeFinanzenBasis(supabase, einrichtungId, einrichtung.bundesland_code, Number(einrichtung.vollzeit_wochenstunden), nrwGruppenById),
    getTeamPresenceForMonth(supabase, einrichtungId, stichtag),
  ]);
  return resolveFinanzenMonat(basis, stichtag, kinderRows, teamRows);
}
