"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOKUMENTE } from "@/lib/rechtstexte/version";

export type ZustimmungErgebnis = { ok: true } | { ok: false; error: string };

/** Speichert die Zustimmung der Träger-Administration zu den aktuellen Versionen von AGB und AVV. Die Datenbank
 * lässt das nur für den eigenen Träger und nur für Träger-Administratoren zu. */
export async function stimmeZu(): Promise<ZustimmungErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { data: profil } = await supabase.from("user_profiles").select("trager_id, role").eq("id", user.id).single();
  if (!profil || profil.role !== "traeger_admin") return { ok: false, error: "Nur die Träger-Administration kann zustimmen." };

  const { error } = await supabase.from("vertragszustimmungen").upsert(
    DOKUMENTE.map((d) => ({ user_id: user.id, trager_id: profil.trager_id, dokument: d.key, version: d.version })),
    { onConflict: "user_id,dokument,version", ignoreDuplicates: true }
  );
  if (error) return { ok: false, error: "Die Zustimmung konnte nicht gespeichert werden." };
  revalidatePath("/", "layout");
  return { ok: true };
}
