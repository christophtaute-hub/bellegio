"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getZugriff } from "@/lib/server/current-user-role";

export type BeitraegeErgebnis = { ok: true } | { ok: false; error: string };

/** Speichert eine Preisliste (Elternbeiträge je Buchungszeit-Band) mit Gültigkeitsdatum. Leere Felder = kein Preis für dieses Band.
 * Eine neue Fassung entsteht, indem ein anderes „gültig ab“ gewählt wird; ältere Fassungen bleiben für die Vergangenheit erhalten. */
export async function speichereBeitraege(
  einrichtungId: string,
  gueltigAb: string,
  eintraege: { bandId: string; betrag: number | null }[]
): Promise<BeitraegeErgebnis> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gueltigAb)) return { ok: false, error: "Bitte ein gültiges Datum angeben." };
  const supabase = await createClient();
  if ((await getZugriff(supabase, einrichtungId, "finanzen")) !== "bearbeiten") return { ok: false, error: "Du darfst die Preisliste nicht ändern." };
  if (eintraege.some((e) => e.betrag !== null && (!Number.isFinite(e.betrag) || e.betrag < 0 || e.betrag > 10000))) {
    return { ok: false, error: "Bitte gültige Beträge angeben." };
  }

  const mitPreis = eintraege.filter((e) => e.betrag !== null);
  const { error: loeschFehler } = await supabase
    .from("einrichtung_beitraege")
    .delete()
    .eq("einrichtung_id", einrichtungId)
    .eq("gueltig_ab", gueltigAb);
  if (loeschFehler) return { ok: false, error: "Die Preisliste konnte nicht gespeichert werden." };

  if (mitPreis.length > 0) {
    const { error } = await supabase.from("einrichtung_beitraege").insert(
      mitPreis.map((e) => ({ einrichtung_id: einrichtungId, booking_time_band_id: e.bandId, betrag_monat: e.betrag as number, gueltig_ab: gueltigAb }))
    );
    if (error) return { ok: false, error: "Die Preisliste konnte nicht gespeichert werden." };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/controlling");
  revalidatePath("/dashboard");
  return { ok: true };
}
