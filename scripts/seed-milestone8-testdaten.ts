/**
 * Milestone 8, Phase L: legt einen isolierten Test-Träger mit einer
 * Beispiel-Kita in NRW und einer in BW an (samt Gruppen/Kindern), plus zwei
 * Testaccounts zum Ausprobieren des granularen Rechte-Systems über
 * Bundesländer hinweg. Rührt bewusst NICHT an den echten Live-Trägern.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone8-testdaten.ts
 *
 * Idempotent: per Namen/E-Mail bereits vorhandene Zeilen werden
 * wiederverwendet statt dupliziert, das Skript kann gefahrlos erneut
 * laufen.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const TEST_TRAEGER_NAME = "Bellegio Test";
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

  // 1. Test-Träger
  let { data: trager } = await supabase
    .from("trager")
    .select("id")
    .eq("name", TEST_TRAEGER_NAME)
    .maybeSingle();
  if (!trager) {
    const { data, error } = await supabase
      .from("trager")
      .insert({ name: TEST_TRAEGER_NAME })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Träger-Insert fehlgeschlagen");
    trager = data;
    console.log(`Träger "${TEST_TRAEGER_NAME}" angelegt.`);
  } else {
    console.log(`Träger "${TEST_TRAEGER_NAME}" existiert bereits.`);
  }
  const tragerId = trager.id;

  // 2. Einrichtungen
  async function findOrCreateEinrichtung(
    name: string,
    bundeslandCode: string,
    city: string
  ) {
    let { data: einrichtung } = await supabase
      .from("einrichtungen")
      .select("id")
      .eq("name", name)
      .eq("trager_id", tragerId)
      .maybeSingle();
    if (!einrichtung) {
      const { data, error } = await supabase
        .from("einrichtungen")
        .insert({
          name,
          trager_id: tragerId,
          bundesland_code: bundeslandCode,
          address_city: city,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Einrichtung-Insert fehlgeschlagen");
      einrichtung = data;
      console.log(`Einrichtung "${name}" (${bundeslandCode}) angelegt.`);
    } else {
      console.log(`Einrichtung "${name}" existiert bereits.`);
    }
    return einrichtung.id;
  }

  const nrwEinrichtungId = await findOrCreateEinrichtung(
    "Testkita NRW",
    "nrw",
    "Köln"
  );
  const bwEinrichtungId = await findOrCreateEinrichtung(
    "Testkita BW",
    "bw",
    "Stuttgart"
  );

  // 3. Gruppen
  async function findOrCreateGruppe(
    einrichtungId: string,
    name: string,
    fields: {
      gruppenart: string;
      sollplatze: number;
      nrw_gruppenform?: string;
      nrw_buchungszeit_stunden?: number;
      bw_betriebsform?: string;
      bw_altersmischung?: boolean;
      bw_oeffnungszeit_stunden?: number;
    }
  ) {
    let { data: gruppe } = await supabase
      .from("gruppen")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("name", name)
      .maybeSingle();
    if (!gruppe) {
      const { data, error } = await supabase
        .from("gruppen")
        .insert({ einrichtung_id: einrichtungId, name, ...fields })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Gruppe-Insert fehlgeschlagen");
      gruppe = data;
      console.log(`  Gruppe "${name}" angelegt.`);
    }
    return gruppe.id;
  }

  const nrwGruppeId = await findOrCreateGruppe(nrwEinrichtungId, "Gruppe I", {
    gruppenart: "altersgemischt",
    sollplatze: 20,
    nrw_gruppenform: "I",
    nrw_buchungszeit_stunden: 35,
  });
  const bwGruppeId = await findOrCreateGruppe(bwEinrichtungId, "Regelgruppe", {
    gruppenart: "kindergarten",
    sollplatze: 20,
    bw_betriebsform: "regelgruppe",
    bw_altersmischung: false,
    bw_oeffnungszeit_stunden: 6,
  });

  // 4. Kinder — je Gruppe ein unauffälliges und eines, das die neue
  // Hinweis-Box im Belegungsmanagement auslöst (Austritt bzw.
  // Vertragsende in Kürze).
  const today = new Date();
  const inZweiMonaten = new Date(today);
  inZweiMonaten.setUTCMonth(inZweiMonaten.getUTCMonth() + 2);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  async function findOrCreateKind(
    einrichtungId: string,
    gruppeId: string,
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
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("kinder")
      .insert({
        einrichtung_id: einrichtungId,
        gruppe_id: gruppeId,
        vorname,
        nachname,
        geburtsdatum: "2021-04-01",
        geschlecht: "keine_angabe",
        status: "aktiv",
        eintritt: "2024-09-01",
        ...extra,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Kind-Insert fehlgeschlagen");
    console.log(`  Kind "${vorname} ${nachname}" angelegt.`);
    return data.id;
  }

  await findOrCreateKind(nrwEinrichtungId, nrwGruppeId, "Lena", "Wagner", {});
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeId, "Finn", "Schröder", {
    austritt: iso(inZweiMonaten),
  });
  await findOrCreateKind(bwEinrichtungId, bwGruppeId, "Mia", "Fischer", {});
  await findOrCreateKind(bwEinrichtungId, bwGruppeId, "Jonas", "Becker", {
    vertrag_gueltig_bis: iso(inZweiMonaten),
  });

  // 5. Testaccounts
  async function findOrCreateAuthUser(email: string) {
    // admin.createUser lehnt Duplikate ab — bei bereits existierendem
    // Account reicht es, die id aus user_profiles zu übernehmen.
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile) return { id: existingProfile.id, created: false };

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "createUser fehlgeschlagen");
    return { id: data.user.id, created: true };
  }

  const katrin = await findOrCreateAuthUser("katrin@bellegio.test");
  if (katrin.created) {
    const { error } = await supabase.from("user_profiles").insert({
      id: katrin.id,
      email: "katrin@bellegio.test",
      full_name: "Katrin Test",
      role: "einrichtungsleitung",
      trager_id: tragerId,
      kann_rechte_verwalten: false,
    });
    if (error) throw new Error(error.message);
    console.log(
      "Testaccount Katrin angelegt (einrichtungsleitung — sieht alle Einrichtungen des Test-Trägers)."
    );
  } else {
    console.log("Testaccount Katrin existiert bereits.");
  }

  const max = await findOrCreateAuthUser("max@bellegio.test");
  if (max.created) {
    const { error } = await supabase.from("user_profiles").insert({
      id: max.id,
      email: "max@bellegio.test",
      full_name: "Max Test",
      role: "mitarbeiter",
      trager_id: tragerId,
      kann_rechte_verwalten: false,
    });
    if (error) throw new Error(error.message);

    const { error: rechteError } = await supabase
      .from("einrichtung_berechtigungen")
      .insert({
        user_id: max.id,
        einrichtung_id: nrwEinrichtungId,
        bereich: "controlling",
        zugriff: "ansehen",
      });
    if (rechteError) throw new Error(rechteError.message);
    console.log(
      "Testaccount Max angelegt (mitarbeiter — sieht nur Testkita NRW, dort nur Controlling/ansehen)."
    );
  } else {
    console.log("Testaccount Max existiert bereits.");
  }

  console.log("\nFertig. Login-Daten:");
  console.log(`  katrin@bellegio.test / ${TEST_PASSWORD}`);
  console.log(`  max@bellegio.test / ${TEST_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
