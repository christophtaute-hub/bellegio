/**
 * Milestone 11, Phase T: rollt das Rechte-System mit den vom Nutzer
 * genannten Testaccounts aus — Katrin/Kristina/Desiree/Gizem/Verena nur
 * für Belegung, ein neuer Personal-Nutzer nur für Personal, ein neuer
 * Controlling-Nutzer mit Ansehen auf allen vier Bereichen. Alle
 * beschränkt auf die 3 Demo-Kitas (Bayern/NRW/BW (Demo)).
 *
 * Setzt außerdem Katrins Zugriff zurück (bisher fälschlich "bearbeiten"
 * auf personal/controlling/szenario, siehe Phase S) auf ausschließlich
 * Belegung.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone11-rechte.ts
 * Idempotent (Lookups per E-Mail, upsert für Rechte).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const TEST_PASSWORD = "test1234";
const DEMO_EINRICHTUNGEN = [
  "Testkita Bayern (Demo)",
  "Testkita NRW (Demo)",
  "Testkita BW (Demo)",
];

type Bereich = "belegung" | "personal" | "controlling" | "szenario";
type Zugriff = "kein_zugriff" | "ansehen" | "bearbeiten";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local)."
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data: trager, error: tragerError } = await supabase
    .from("trager")
    .select("id")
    .eq("name", "Villa Kunterbunt")
    .single();
  if (tragerError || !trager) throw new Error(tragerError?.message ?? "Träger nicht gefunden");
  const tragerId = trager.id;

  const { data: einrichtungen, error: einrichtungenError } = await supabase
    .from("einrichtungen")
    .select("id, name")
    .in("name", DEMO_EINRICHTUNGEN);
  if (einrichtungenError) throw new Error(einrichtungenError.message);
  if (!einrichtungen || einrichtungen.length !== 3) {
    throw new Error(`Erwartete 3 Demo-Einrichtungen, gefunden: ${einrichtungen?.length ?? 0}.`);
  }
  const einrichtungIds = einrichtungen.map((e) => e.id);

  async function findOrCreateUser(email: string, fullName: string) {
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile) return existingProfile.id;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? `createUser fehlgeschlagen für ${email}`);

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: "mitarbeiter",
      trager_id: tragerId,
      kann_rechte_verwalten: false,
    });
    if (profileError) throw new Error(profileError.message);
    console.log(`  Nutzer "${fullName}" (${email}) angelegt.`);
    return data.user.id;
  }

  async function setzeRechte(userId: string, bereichZugriff: Partial<Record<Bereich, Zugriff>>) {
    const ALLE_BEREICHE: Bereich[] = ["belegung", "personal", "controlling", "szenario"];
    const rows = einrichtungIds.flatMap((einrichtungId) =>
      ALLE_BEREICHE.map((bereich) => ({
        user_id: userId,
        einrichtung_id: einrichtungId,
        bereich,
        zugriff: bereichZugriff[bereich] ?? "kein_zugriff",
        updated_at: new Date().toISOString(),
      }))
    );
    const { error } = await supabase
      .from("einrichtung_berechtigungen")
      .upsert(rows, { onConflict: "user_id,einrichtung_id,bereich" });
    if (error) throw new Error(error.message);
  }

  // Belegung-Nutzerinnen: Katrin (bestehend, wird korrigiert) + 4 neue.
  const belegungNutzer = [
    { email: "katrin@bellegio.test", name: "Katrin Test" },
    { email: "kristina@bellegio.test", name: "Kristina Test" },
    { email: "desiree@bellegio.test", name: "Desiree Test" },
    { email: "gizem@bellegio.test", name: "Gizem Test" },
    { email: "verena@bellegio.test", name: "Verena Test" },
  ];
  for (const nutzer of belegungNutzer) {
    const userId = await findOrCreateUser(nutzer.email, nutzer.name);
    await setzeRechte(userId, { belegung: "bearbeiten" });
    console.log(`  ${nutzer.name}: Belegung/bearbeiten auf den 3 Demo-Kitas gesetzt.`);
  }

  // Personal-Nutzerin.
  const personalUserId = await findOrCreateUser("sabine@bellegio.test", "Sabine Test (Personal)");
  await setzeRechte(personalUserId, { personal: "bearbeiten" });
  console.log("  Sabine: Personal/bearbeiten auf den 3 Demo-Kitas gesetzt.");

  // Controlling-Nutzer (sieht alles, bearbeitet nichts).
  const controllingUserId = await findOrCreateUser("oliver@bellegio.test", "Oliver Test (Controlling)");
  await setzeRechte(controllingUserId, {
    belegung: "ansehen",
    personal: "ansehen",
    controlling: "ansehen",
    szenario: "ansehen",
  });
  console.log("  Oliver: ansehen auf allen 4 Bereichen der 3 Demo-Kitas gesetzt.");

  console.log("\nFertig. Login-Daten (alle Passwort test1234):");
  for (const nutzer of belegungNutzer) console.log(`  ${nutzer.email}`);
  console.log("  sabine@bellegio.test");
  console.log("  oliver@bellegio.test");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
