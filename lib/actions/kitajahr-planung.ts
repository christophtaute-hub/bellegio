"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseSzenarioRechner, getZugriff } from "@/lib/server/current-user-role";
import type { PlanungDaten } from "@/lib/planung/kitajahr";

export type PlanungErgebnisAktion = { ok: true } | { ok: false; error: string };

/** Speichert die Änderungen der Leitung am Vorschlag (ein Plan je Einrichtung und Kitajahr). */
export async function speichereKitajahrPlanung(einrichtungId: string, kitajahrStart: string, daten: PlanungDaten): Promise<PlanungErgebnisAktion> {
  if (!/^\d{4}-\d{2}-01$/.test(kitajahrStart)) return { ok: false, error: "Ungültiger Zeitraum." };
  const supabase = await createClient();
  if ((await getZugriff(supabase, einrichtungId, "szenario")) !== "bearbeiten") return { ok: false, error: "Du darfst die Planung nicht ändern." };

  const sauber: PlanungDaten = {
    kinder: Object.fromEntries(
      Object.entries(daten.kinder ?? {})
        .filter(([, n]) => Number.isFinite(n))
        .map(([id, n]) => [id, Math.min(500, Math.max(0, Math.round(n)))])
    ),
    einstellenGeplant: Math.min(2000, Math.max(0, Number(daten.einstellenGeplant) || 0)),
  };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("kitajahr_planung").upsert(
    { einrichtung_id: einrichtungId, kitajahr_start: kitajahrStart, daten: sauber, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
    { onConflict: "einrichtung_id,kitajahr_start" }
  );
  if (error) return { ok: false, error: "Die Planung konnte nicht gespeichert werden." };
  revalidatePath("/szenario");
  return { ok: true };
}

/** Verwirft die eigenen Änderungen — danach gilt wieder der automatische Vorschlag. */
export async function verwerfeKitajahrPlanung(einrichtungId: string, kitajahrStart: string): Promise<PlanungErgebnisAktion> {
  const supabase = await createClient();
  if (!(await canUseSzenarioRechner(supabase, einrichtungId)) || (await getZugriff(supabase, einrichtungId, "szenario")) !== "bearbeiten") {
    return { ok: false, error: "Du darfst die Planung nicht ändern." };
  }
  const { error } = await supabase.from("kitajahr_planung").delete().eq("einrichtung_id", einrichtungId).eq("kitajahr_start", kitajahrStart);
  if (error) return { ok: false, error: "Die Planung konnte nicht zurückgesetzt werden." };
  revalidatePath("/szenario");
  return { ok: true };
}
