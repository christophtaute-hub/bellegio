/**
 * Produktion einrichten, Schritt "Erstbetreiber": legt im (leeren) Produktionsprojekt den Betreiber an.
 *
 * - Lädt Christoph per E-Mail ein (kein Passwort im Skript, nichts im Chat): er setzt es selbst über den Link.
 * - Legt für ihn einen eigenen Träger an und macht ihn dort zum Träger-Administrator (user_profiles.trager_id ist
 *   Pflicht, und so kann er die App auch selbst nutzen).
 * - Trägt ihn als einzigen Betreiber in platform_operators ein.
 * - Befüllt die Betreiber-/Preisdaten, die bisher nur per SQL in der Testumgebung gesetzt wurden (Listenpreise Variante B).
 *
 * Nutzung (mit den Zugangsdaten des PRODUKTIONSprojekts, nie mit denen der Testumgebung):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... APP_URL=https://bellegio.de \
 *     npx tsx scripts/prod-erstbetreiber.ts
 * Idempotent: ein zweiter Lauf legt nichts doppelt an.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const BETREIBER_EMAIL = "christoph.taute@web.de";
const BETREIBER_NAME = "Christoph Taute";
const TRAEGER_NAME = "Christoph Taute Akademie";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL;
  if (!url || !key || !appUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und APP_URL müssen gesetzt sein.");
  if (url.includes("pvrbiamdcyxvnmzfstbk")) throw new Error("Das ist das TEST-Projekt. Dieses Skript ist nur für die Produktion gedacht.");
  const sb = createClient<Database>(url, key);

  // 1. Träger
  let { data: traeger } = await sb.from("trager").select("id").eq("name", TRAEGER_NAME).maybeSingle();
  if (!traeger) {
    const { data, error } = await sb.from("trager").insert({ name: TRAEGER_NAME }).select("id").single();
    if (error || !data) throw new Error(`Träger: ${error?.message}`);
    traeger = data;
    console.log("Träger angelegt.");
  }

  // 2. Nutzer (Einladung per E-Mail)
  const { data: liste } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = liste?.users.find((u) => u.email?.toLowerCase() === BETREIBER_EMAIL)?.id;
  if (!userId) {
    const { data, error } = await sb.auth.admin.inviteUserByEmail(BETREIBER_EMAIL, { redirectTo: `${appUrl}/passwort-setzen` });
    if (error || !data.user) throw new Error(`Einladung: ${error?.message}`);
    userId = data.user.id;
    console.log(`Einladung an ${BETREIBER_EMAIL} verschickt.`);
  }

  // 3. Profil + Betreiber-Eintrag
  const { error: pe } = await sb
    .from("user_profiles")
    .upsert({ id: userId, trager_id: traeger.id, role: "traeger_admin", full_name: BETREIBER_NAME, email: BETREIBER_EMAIL }, { onConflict: "id" });
  if (pe) throw new Error(`Profil: ${pe.message}`);
  const { error: oe } = await sb.from("platform_operators").upsert({ user_id: userId }, { onConflict: "user_id" });
  if (oe) throw new Error(`Betreiber: ${oe.message}`);

  // 4. Listenpreise (Variante B) — nur setzen, wenn noch leer
  const { data: preise } = await sb.from("listenpreise").select("*").eq("id", true).single();
  if (preise && preise.grundgebuehr_pro_einrichtung == null) {
    const { error } = await sb
      .from("listenpreise")
      .update({ grundgebuehr_pro_einrichtung: 15, preis_pro_kind_1_30: 1.2, preis_pro_kind_31_60: 0.8, preis_pro_kind_ab_61: 0.6 })
      .eq("id", true);
    if (error) throw new Error(`Listenpreise: ${error.message}`);
    console.log("Listenpreise gesetzt (15 € Grundgebühr, 1,20/0,80/0,60 € je Kind).");
  }

  console.log("Fertig. Bitte den Einladungslink in der Mail öffnen und das Passwort festlegen.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
