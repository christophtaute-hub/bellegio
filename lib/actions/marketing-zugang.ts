"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MarketingZugriff } from "@/lib/server/marketing";

export type MarketingZugangErgebnis = { ok: true } | { ok: false; error: string };

/** Vergibt oder entzieht das Marketing-Recht (trägerweit). Nur Träger-Admins; erzwungen durch die RLS von marketing_zugang. */
export async function setzeMarketingZugang(userId: string, zugriff: MarketingZugriff): Promise<MarketingZugangErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { data: ich } = await supabase.from("user_profiles").select("role, trager_id").eq("id", user.id).single();
  if (ich?.role !== "traeger_admin") return { ok: false, error: "Das darf nur die Träger-Administration." };
  const { data: ziel } = await supabase.from("user_profiles").select("role, trager_id").eq("id", userId).single();
  if (!ziel || ziel.trager_id !== ich.trager_id) return { ok: false, error: "Nutzer nicht gefunden." };
  if (ziel.role === "traeger_admin") return { ok: false, error: "Träger-Admins haben das Recht immer." };

  const { error } =
    zugriff === "kein_zugriff"
      ? await supabase.from("marketing_zugang").delete().eq("user_id", userId)
      : await supabase.from("marketing_zugang").upsert({ user_id: userId, trager_id: ich.trager_id, zugriff }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Speichern hat nicht geklappt." };
  revalidatePath("/einstellungen/nutzer");
  return { ok: true };
}
