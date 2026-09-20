import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Client mit Service-Role-Key: umgeht RLS. Nur in Server Actions verwenden,
 * die den Aufrufer vorher selbst geprüft haben (Betreiber bzw. Träger-Admin) —
 * und nur für Dinge, die RLS ohnehin nicht abbildet (Auth-Nutzer anlegen). */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht konfiguriert.");
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
}
