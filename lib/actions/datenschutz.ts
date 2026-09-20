"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { pruefeLoeschfrist } from "@/lib/datenschutz/loeschfrist";

export type DatenschutzErgebnis = { ok: true } | { ok: false; error: string };
export type DatenschutzAktion = "loeschen" | "anonymisieren";

function meldung(fehler: { message: string }): string {
  // Die Datenbankfunktionen liefern verständliche deutsche Meldungen (Berechtigung, Status).
  return /Nur |bereits|nicht gefunden/.test(fehler.message) ? fehler.message : "Der Vorgang konnte nicht ausgeführt werden.";
}

/** Löscht ein Kind endgültig oder anonymisiert es. Erlaubt nur der Träger-Administration und nur für ausgetretene
 * Kinder — die Prüfung liegt in der Datenbankfunktion, nicht hier. */
export async function kindDatenschutz(kindId: string, aktion: DatenschutzAktion): Promise<DatenschutzErgebnis> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("kind_datenschutz", { p_kind_id: kindId, p_aktion: aktion });
  if (error) return { ok: false, error: meldung(error) };
  for (const pfad of ["/kinder", "/gruppen", "/dashboard", "/controlling", "/einstellungen/datenschutz"]) revalidatePath(pfad);
  return { ok: true };
}

export async function teamDatenschutz(teamId: string, aktion: DatenschutzAktion): Promise<DatenschutzErgebnis> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("team_datenschutz", { p_team_id: teamId, p_aktion: aktion });
  if (error) return { ok: false, error: meldung(error) };
  for (const pfad of ["/team", "/dashboard", "/controlling", "/einstellungen/datenschutz"]) revalidatePath(pfad);
  return { ok: true };
}

/** Speichert die Löschfrist (Erinnerung) einer Einrichtung. */
export async function speichereLoeschfrist(einrichtungId: string, monate: number | null): Promise<DatenschutzErgebnis> {
  const fehler = pruefeLoeschfrist(monate);
  if (fehler) return { ok: false, error: fehler };
  if ((await getCurrentUserRole()) !== "traeger_admin") return { ok: false, error: "Nur die Träger-Administration kann die Löschfrist ändern." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("einrichtungen")
    .update({ loeschfrist_monate: monate })
    .eq("id", einrichtungId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Die Löschfrist konnte nicht gespeichert werden." };
  revalidatePath("/einstellungen/datenschutz");
  return { ok: true };
}
