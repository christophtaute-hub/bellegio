import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Datum, das als „schon immer“ gilt, wenn ein Kind keinen Eintritt hat. */
export const FRUEHESTES_DATUM = "2000-01-01";

export function sollGruppenHistorieGeschriebenWerden(alt: string | null, neu: string | null): boolean {
  return neu !== null && alt !== neu;
}

/** Hält die Gruppenhistorie (kind_gruppen_historie) bei einer Gruppenänderung aktuell, damit Belegung und Forecast zum
 * jeweiligen Stichtag die richtige Gruppe sehen (kinder_presence_at_date löst die Gruppe über die Historie auf).
 *
 * - Hat das Kind noch keine Historie, wird zuerst die bisherige Gruppe ab Eintritt festgehalten (sonst würde die alte Gruppe
 *   rückwirkend verschwinden).
 * - Der neue Eintrag gilt ab `wirksamAb` (Standard heute).
 * - Eine Änderung in der Kind-Bearbeitung ersetzt einen noch nicht wirksamen, geplanten Wechsel (`gueltig_ab` in der Zukunft). */
export async function schreibeGruppenHistorie(
  supabase: SupabaseClient<Database>,
  kindId: string,
  alteGruppe: string | null,
  neueGruppe: string | null,
  optionen: { eintritt: string | null; heute: string; wirksamAb?: string | null; geplanteLoeschen?: boolean }
): Promise<void> {
  if (!sollGruppenHistorieGeschriebenWerden(alteGruppe, neueGruppe)) return;

  const { count } = await supabase.from("kind_gruppen_historie").select("id", { count: "exact", head: true }).eq("kind_id", kindId);
  if ((count ?? 0) === 0 && alteGruppe) {
    await supabase
      .from("kind_gruppen_historie")
      .upsert({ kind_id: kindId, gruppe_id: alteGruppe, gueltig_ab: optionen.eintritt ?? FRUEHESTES_DATUM }, { onConflict: "kind_id,gueltig_ab" });
  }
  if (optionen.geplanteLoeschen ?? true) {
    await supabase.from("kind_gruppen_historie").delete().eq("kind_id", kindId).gt("gueltig_ab", optionen.heute);
  }
  const { error } = await supabase
    .from("kind_gruppen_historie")
    .upsert({ kind_id: kindId, gruppe_id: neueGruppe, gueltig_ab: optionen.wirksamAb || optionen.heute }, { onConflict: "kind_id,gueltig_ab" });
  // Ein fehlgeschlagener Historie-Eintrag darf das Speichern des Kindes nicht verhindern — nur protokollieren.
  if (error) console.error("Gruppen-Historie konnte nicht geschrieben werden:", error.message);
}
