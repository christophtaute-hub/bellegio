/**
 * Produktion einrichten, Abschlusskontrolle: prüft, dass in der Produktionsumgebung nichts aus der Testwelt gelandet ist
 * und die Pflichtdaten da sind. Nur lesend.
 *
 * Nutzung: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/prod-pruefen.ts
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  const sb = createClient<Database>(url, key);
  const probleme: string[] = [];
  const ok = (text: string) => console.log(`✓ ${text}`);

  if (url.includes("pvrbiamdcyxvnmzfstbk")) probleme.push("Die URL zeigt auf das TEST-Projekt.");

  const { data: betreiber } = await sb.from("platform_operators").select("user_id");
  if ((betreiber?.length ?? 0) === 1) ok("Genau ein Betreiber eingetragen.");
  else probleme.push(`platform_operators enthält ${betreiber?.length ?? 0} Einträge (erwartet: 1).`);

  const { data: nutzer } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const testkonten = (nutzer?.users ?? []).filter((u) => /@bellegio\.test$/i.test(u.email ?? "") || u.email === "demo@bellegio.de");
  if (testkonten.length === 0) ok("Keine Test- oder Demo-Konten.");
  else probleme.push(`Test-/Demo-Konten vorhanden: ${testkonten.map((u) => u.email).join(", ")}`);

  const { count: demoProfile } = await sb.from("user_profiles").select("id", { count: "exact", head: true }).eq("ist_demo", true);
  if (!demoProfile) ok("Kein Profil mit ist_demo.");
  else probleme.push(`${demoProfile} Profil(e) mit ist_demo.`);

  const { count: demoRechnungen } = await sb.from("rechnungen").select("id", { count: "exact", head: true }).like("nummer", "DEMO-%");
  if (!demoRechnungen) ok("Keine Demo-Rechnungen.");
  else probleme.push(`${demoRechnungen} Demo-Rechnung(en).`);

  const { data: be } = await sb.from("betreiber_einstellungen").select("firmenname, anschrift, steuernummer, iban").eq("id", true).single();
  if (!be?.firmenname || !be.anschrift) probleme.push("betreiber_einstellungen: Firmenname/Anschrift fehlen (Rechnungen).");
  else ok("Betreiber-Einstellungen vorhanden.");
  if (!be?.steuernummer || be.steuernummer === "folgt") probleme.push("Steuernummer fehlt oder steht noch auf „folgt“ (Pflicht auf Rechnungen).");
  if (!be?.iban) probleme.push("IBAN fehlt (Pflicht für den Rechnungsdruck).");

  const { data: bo } = await sb.from("betreiber_oeffentlich").select("firmenname, anschrift, email").eq("id", true).single();
  if (!bo?.firmenname || !bo.anschrift || !bo.email) probleme.push("betreiber_oeffentlich (Impressum/Datenschutz) unvollständig.");
  else ok("Impressum-Daten vorhanden.");

  const { data: preise } = await sb.from("listenpreise").select("*").eq("id", true).single();
  if (preise?.grundgebuehr_pro_einrichtung == null) probleme.push("Listenpreise nicht gesetzt (Landingpage zeigt „Preise folgen“).");
  else ok("Listenpreise gesetzt.");

  if (probleme.length > 0) {
    console.log("\nOffen:");
    for (const p of probleme) console.log(`✗ ${p}`);
    process.exit(1);
  }
  console.log("\nAlles in Ordnung.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
