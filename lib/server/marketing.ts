import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MarketingZugriff = "kein_zugriff" | "ansehen" | "bearbeiten";

/** Marketing-Recht des angemeldeten Nutzers (trägerweit). Träger-Admins haben es immer; sonst entscheidet ein Eintrag in
 * marketing_zugang. Gleiche Regel wie app.marketing_zugriff() in der Datenbank — dort wird sie zusätzlich erzwungen. */
export const getMarketingZugriff = cache(async (): Promise<MarketingZugriff> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "kein_zugriff";
  const { data: profil } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (profil?.role === "traeger_admin") return "bearbeiten";
  const { data: zugang } = await supabase.from("marketing_zugang").select("zugriff").eq("user_id", user.id).maybeSingle();
  return zugang?.zugriff === "bearbeiten" ? "bearbeiten" : zugang?.zugriff === "ansehen" ? "ansehen" : "kein_zugriff";
});
