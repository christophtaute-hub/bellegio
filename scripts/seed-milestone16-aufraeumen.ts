/**
 * Milestone 16: Aufräumen der Demo-Daten nach dem zweiten großen
 * Rückmeldungs-Batch (2026-09-18).
 *
 * Voraussetzung (bereits per SQL erledigt): "Villa Kunterbunt", "Kita
 * München Pasing", "Kita Sonnenschein", "Kita Regenbogen" gelöscht; die 3
 * verbleibenden Demo-Kitas in "Testkita Bayern"/"Testkita
 * Baden-Württemberg"/"Testkita Nordrhein-Westfalen" umbenannt (Suffix
 * "(Demo)" entfernt), BW-Standort/Auswärtigen-Quote gesetzt.
 *
 * Dieses Skript:
 * - Setzt je Kita eine Gruppe auf "voll" (Sollplätze = aktuelle
 *   Kinderzahl) und ergänzt Kinder in Baden-Württemberg/NRW (deren
 *   Personalformel gruppen-/nicht kopfzahlbasiert ist — unkritisch für den
 *   Personalschlüssel), Bayern bleibt bei der bestehenden Kinderzahl, um
 *   den knappen Anstellungsschlüssel nicht zu gefährden.
 * - Legt je Kita mindestens ein Nachrücker-Kind an (wirkt sich nicht auf
 *   Personalschlüssel-Berechnungen aus, da nur status='aktiv' gezählt wird).
 * - Setzt Wohnort-Werte für Baden-Württemberg (Demo der 10%-Auswärtigen-Quote).
 * - Demo-Szenario "Anstellungsschlüssel bricht ab April 2027": ein
 *   Bayern-Team-Mitglied bekommt austritt='2027-03-31'.
 * - Aktualisiert die Test-Nutzer aus Milestone 11 mit echten Namen und legt
 *   Navina Mannß (Belegung), Olga Dashkevish (Controlling, ersetzt
 *   Oliver-Platzhalter) sowie Enno/Aniko (kein Zugriff) an.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone16-aufraeumen.ts
 * Idempotent (Lookups per Name/E-Mail).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const TEST_PASSWORD = "test1234";

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

  const { data: einrichtungen, error: einrichtungenError } = await supabase
    .from("einrichtungen")
    .select("id, name")
    .in("name", [
      "Testkita Bayern",
      "Testkita Baden-Württemberg",
      "Testkita Nordrhein-Westfalen",
    ]);
  if (einrichtungenError) throw new Error(einrichtungenError.message);
  if (!einrichtungen || einrichtungen.length !== 3) {
    throw new Error(`Erwartete 3 Demo-Einrichtungen, gefunden: ${einrichtungen?.length ?? 0}.`);
  }
  const byId = einrichtungen.find((e) => e.name === "Testkita Bayern")!.id;
  const bwId = einrichtungen.find((e) => e.name === "Testkita Baden-Württemberg")!.id;
  const nrwId = einrichtungen.find((e) => e.name === "Testkita Nordrhein-Westfalen")!.id;

  async function findGruppeId(einrichtungId: string, name: string): Promise<string> {
    const { data, error } = await supabase
      .from("gruppen")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("name", name)
      .single();
    if (error || !data) throw new Error(`Gruppe "${name}" nicht gefunden: ${error?.message}`);
    return data.id;
  }

  async function setSollplatze(gruppeId: string, sollplatze: number) {
    const { error } = await supabase
      .from("gruppen")
      .update({ sollplatze })
      .eq("id", gruppeId);
    if (error) throw new Error(error.message);
  }

  async function findOrCreateKind(
    einrichtungId: string,
    vorname: string,
    nachname: string,
    extra: Partial<Database["public"]["Tables"]["kinder"]["Insert"]>
  ) {
    const { data: existing } = await supabase
      .from("kinder")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("kinder").update(extra).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return existing.id;
    }
    const { data, error } = await supabase
      .from("kinder")
      .insert({
        einrichtung_id: einrichtungId,
        vorname,
        nachname,
        geburtsdatum: "2023-01-01",
        geschlecht: "keine_angabe",
        status: "aktiv",
        eintritt: "2025-09-01",
        ...extra,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Kind-Insert fehlgeschlagen");
    console.log(`  Kind "${vorname} ${nachname}" angelegt.`);
    return data.id;
  }

  // ---- Bayern: Krippengruppe (6 aktive Kinder) wird "voll", Kindergartengruppe bleibt offen. ----
  console.log("Bayern: Krippengruppe auf voll setzen, Nachrücker anlegen …");
  const byKrippeId = await findGruppeId(byId, "Krippengruppe");
  await setSollplatze(byKrippeId, 6);
  const byKindergartenId = await findGruppeId(byId, "Kindergartengruppe");
  await findOrCreateKind(byId, "Mira", "Albrecht", {
    gruppe_id: byKindergartenId,
    geburtsdatum: "2021-11-15",
    geschlecht: "weiblich",
    status: "nachruecker",
    eintritt: null,
  });

  // ---- Baden-Württemberg: Kinderkrippe auffüllen + auf voll setzen, Wohnort-Werte für die 10%-Quote. ----
  console.log("Baden-Württemberg: Kinderkrippe auffüllen, Wohnort-Werte setzen …");
  const bwKrippeId = await findGruppeId(bwId, "Kinderkrippe");
  const bwKrippeKinder = [
    { vorname: "Ida", nachname: "Sailer", geburtsdatum: "2024-02-10", geschlecht: "weiblich" as const, wohnort: "Stuttgart" },
    { vorname: "Theo", nachname: "Maurer", geburtsdatum: "2024-05-22", geschlecht: "maennlich" as const, wohnort: "Stuttgart" },
    { vorname: "Elif", nachname: "Kaya", geburtsdatum: "2023-09-03", geschlecht: "weiblich" as const, wohnort: "Stuttgart" },
    { vorname: "Noah", nachname: "Frick", geburtsdatum: "2023-12-18", geschlecht: "maennlich" as const, wohnort: "Böblingen" },
    { vorname: "Selin", nachname: "Demir", geburtsdatum: "2024-01-30", geschlecht: "weiblich" as const, wohnort: "Stuttgart" },
  ];
  for (const kind of bwKrippeKinder) {
    await findOrCreateKind(bwId, kind.vorname, kind.nachname, {
      gruppe_id: bwKrippeId,
      geburtsdatum: kind.geburtsdatum,
      geschlecht: kind.geschlecht,
      status: "aktiv",
      wohnort: kind.wohnort,
    });
  }
  await setSollplatze(bwKrippeId, 8);
  // Wohnort für bestehende BW-Kinder ergänzen (u.a. den vorhandenen Nachrücker).
  const { data: bwBestehende } = await supabase
    .from("kinder")
    .select("id, vorname, nachname, status")
    .eq("einrichtung_id", bwId)
    .neq("gruppe_id", bwKrippeId);
  for (const kind of bwBestehende ?? []) {
    const wohnort = kind.status === "nachruecker" ? "Esslingen" : "Stuttgart";
    await supabase.from("kinder").update({ wohnort }).eq("id", kind.id);
  }

  // ---- NRW: Gruppe II (Krippe) auffüllen + auf voll setzen, Nachrücker in Gruppe III. ----
  console.log("NRW: Gruppe II auffüllen, Nachrücker anlegen …");
  const nrwGruppeIIId = await findGruppeId(nrwId, "Gruppe II");
  const nrwKrippeKinder = [
    { vorname: "Finja", nachname: "Neumann", geburtsdatum: "2024-03-12", geschlecht: "weiblich" as const },
    { vorname: "Levi", nachname: "Schuster", geburtsdatum: "2024-06-01", geschlecht: "maennlich" as const },
    { vorname: "Amira", nachname: "Celik", geburtsdatum: "2023-10-25", geschlecht: "weiblich" as const },
    { vorname: "Milan", nachname: "Weller", geburtsdatum: "2023-08-14", geschlecht: "maennlich" as const },
    { vorname: "Zoe", nachname: "Brand", geburtsdatum: "2024-04-05", geschlecht: "weiblich" as const },
  ];
  for (const kind of nrwKrippeKinder) {
    await findOrCreateKind(nrwId, kind.vorname, kind.nachname, {
      gruppe_id: nrwGruppeIIId,
      geburtsdatum: kind.geburtsdatum,
      geschlecht: kind.geschlecht,
      status: "aktiv",
    });
  }
  await setSollplatze(nrwGruppeIIId, 8);
  const nrwGruppeIIIId = await findGruppeId(nrwId, "Gruppe III");
  await findOrCreateKind(nrwId, "Ben", "Kraft", {
    gruppe_id: nrwGruppeIIIId,
    geburtsdatum: "2021-07-08",
    geschlecht: "maennlich",
    status: "nachruecker",
    eintritt: null,
  });

  // ---- Demo: Bayern-Anstellungsschlüssel bricht ab April 2027. ----
  console.log("Bayern: Austritt für Julia Vogt zum 31.03.2027 setzen (Anstellungsschlüssel-Demo) …");
  const { error: austrittError } = await supabase
    .from("team")
    .update({ austritt: "2027-03-31" })
    .eq("einrichtung_id", byId)
    .eq("vorname", "Julia")
    .eq("nachname", "Vogt");
  if (austrittError) throw new Error(austrittError.message);

  // ---- Nutzer mit echten Namen + neue Accounts (Phase X2b). ----
  console.log("Nutzer aktualisieren/anlegen …");

  async function findOrCreateUser(email: string, fullName: string): Promise<string> {
    const { data: existingByEmail } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingByEmail) {
      await supabase.from("user_profiles").update({ full_name: fullName }).eq("id", existingByEmail.id);
      return existingByEmail.id;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? `createUser fehlgeschlagen für ${email}`);
    const { data: trager } = await supabase
      .from("einrichtungen")
      .select("trager_id")
      .eq("id", byId)
      .single();
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: "mitarbeiter",
      trager_id: trager!.trager_id,
      kann_rechte_verwalten: false,
    });
    if (profileError) throw new Error(profileError.message);
    console.log(`  Nutzer "${fullName}" (${email}) angelegt.`);
    return data.user.id;
  }

  type Bereich = "belegung" | "personal" | "controlling" | "szenario";
  type Zugriff = "kein_zugriff" | "ansehen" | "bearbeiten";
  const einrichtungIds = [byId, bwId, nrwId];

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

  // Belegung: Katrin Krüger, Desiree Felchner, Gizem Mengi, Kristina Thoma,
  // Verena Roth (bestehende Accounts, Name aktualisiert) + Navina Mannß (neu).
  const belegungNutzer = [
    { email: "katrin@bellegio.test", name: "Katrin Krüger" },
    { email: "kristina@bellegio.test", name: "Kristina Thoma" },
    { email: "desiree@bellegio.test", name: "Desiree Felchner" },
    { email: "gizem@bellegio.test", name: "Gizem Mengi" },
    { email: "verena@bellegio.test", name: "Verena Roth" },
    { email: "navina@bellegio.test", name: "Navina Mannß" },
  ];
  for (const nutzer of belegungNutzer) {
    const userId = await findOrCreateUser(nutzer.email, nutzer.name);
    await setzeRechte(userId, { belegung: "bearbeiten" });
  }
  console.log("  Belegung: Katrin, Kristina, Desiree, Gizem, Verena, Navina gesetzt.");

  // Personal: Sabine (unverändert).
  const personalUserId = await findOrCreateUser("sabine@bellegio.test", "Sabine Test (Personal)");
  await setzeRechte(personalUserId, { personal: "bearbeiten" });
  console.log("  Personal: Sabine gesetzt.");

  // Controlling: Olga Dashkevish ersetzt den "Oliver"-Platzhalter.
  const { data: oliverProfil } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", "oliver@bellegio.test")
    .maybeSingle();
  let olgaUserId: string;
  if (oliverProfil) {
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(oliverProfil.id, {
      email: "olga@bellegio.test",
    });
    if (authUpdateError) throw new Error(authUpdateError.message);
    const { error: profileUpdateError } = await supabase
      .from("user_profiles")
      .update({ email: "olga@bellegio.test", full_name: "Olga Dashkevish" })
      .eq("id", oliverProfil.id);
    if (profileUpdateError) throw new Error(profileUpdateError.message);
    olgaUserId = oliverProfil.id;
    console.log('  Platzhalter "Oliver" zu Olga Dashkevish (olga@bellegio.test) umbenannt.');
  } else {
    olgaUserId = await findOrCreateUser("olga@bellegio.test", "Olga Dashkevish");
  }
  await setzeRechte(olgaUserId, {
    belegung: "ansehen",
    personal: "ansehen",
    controlling: "ansehen",
    szenario: "ansehen",
  });
  console.log("  Controlling: Olga Dashkevish gesetzt.");

  // Ohne jeden Zugriff: Enno und Aniko (Demo für "Zugriff verweigert").
  const rechteloseNutzer = [
    { email: "enno@bellegio.test", name: "Enno Test" },
    { email: "aniko@bellegio.test", name: "Aniko Test" },
  ];
  for (const nutzer of rechteloseNutzer) {
    const userId = await findOrCreateUser(nutzer.email, nutzer.name);
    await setzeRechte(userId, {});
  }
  console.log("  Ohne Zugriff: Enno, Aniko gesetzt (kein_zugriff auf allen Bereichen).");

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
