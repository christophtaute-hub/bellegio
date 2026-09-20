import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole, isPlatformOperator } from "@/lib/server/current-user-role";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { DOKUMENTE } from "@/lib/rechtstexte/version";

/** Muss die Träger-Administration AGB und AVV (in der aktuellen Version) noch bestätigen? Nur relevant, wenn die
 * Rechtstexte freigegeben sind — solange sie Entwürfe sind, wird niemand zur Zustimmung gezwungen. Der Betreiber
 * selbst ist ausgenommen. */
export async function zustimmungOffen(): Promise<boolean> {
  const [rolle, istBetreiber] = await Promise.all([getCurrentUserRole(), isPlatformOperator()]);
  if (rolle !== "traeger_admin" || istBetreiber) return false;

  const supabase = await createClient();
  const betreiber = await ladeBetreiberOeffentlich(supabase);
  if (!betreiber.rechtstexte_geprueft) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("vertragszustimmungen").select("dokument, version").eq("user_id", user.id);
  return DOKUMENTE.some((d) => !(data ?? []).some((z) => z.dokument === d.key && z.version === d.version));
}
