import { createClient } from "@/lib/supabase/server";

export type MfaStatus = "nicht_eingerichtet" | "bestaetigt" | "code_erforderlich";

/** Zwei-Faktor-Stand der aktuellen Sitzung: kein Faktor eingerichtet, Faktor eingerichtet und in dieser Sitzung
 * bestätigt, oder eingerichtet, aber noch nicht bestätigt (dann muss der Code eingegeben werden). */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!data) return "nicht_eingerichtet";
  if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") return "code_erforderlich";
  if (data.currentLevel === "aal2") return "bestaetigt";
  return "nicht_eingerichtet";
}
