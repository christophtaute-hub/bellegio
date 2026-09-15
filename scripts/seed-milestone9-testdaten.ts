/**
 * Milestone 9, Phasen M+N: verschiebt die Milestone-8-Demo-Kitas
 * ("Testkita NRW"/"Testkita BW") in Christophs echten Träger (Villa
 * Kunterbunt), legt eine dritte Demo-Kita "Testkita Bayern (Demo)" an,
 * und füllt alle drei mit mehreren realistischen Gruppen inkl. Kindern
 * und Personal — dimensioniert nach den jeweiligen Bundesland-Formeln
 * (nrw_personalstunden / bw_personalschluessel / Bayern-Gewichtungsfaktoren),
 * damit Team/Controlling/Dashboard plausible statt leere Zahlen zeigen.
 *
 * Passt außerdem Katrins und Max' Zugriff an: Katrin wird von
 * "einrichtungsleitung" (Blanko-Zugriff auf den ganzen Träger, inkl. der
 * ECHTEN Villa-Kunterbunt-Daten) auf "mitarbeiter" mit gezielten Rechten
 * NUR für die 3 Demo-Kitas umgestellt.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone9-testdaten.ts
 * Idempotent (Lookups per Name/E-Mail), kann gefahrlos erneut laufen.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

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

  // 1. Christophs echten Träger finden.
  const { data: villaTrager, error: villaError } = await supabase
    .from("trager")
    .select("id")
    .eq("name", "Villa Kunterbunt")
    .single();
  if (villaError || !villaTrager) {
    throw new Error(
      "Träger 'Villa Kunterbunt' nicht gefunden: " + villaError?.message
    );
  }
  const villaTragerId = villaTrager.id;
  console.log(`Träger "Villa Kunterbunt" gefunden (${villaTragerId}).`);

  // 2. Testkita NRW/BW in diesen Träger verschieben + umbenennen.
  async function moveAndRenameEinrichtung(altName: string, neuerName: string) {
    const { data: existing } = await supabase
      .from("einrichtungen")
      .select("id, name")
      .in("name", [altName, neuerName])
      .maybeSingle();
    if (!existing) {
      throw new Error(`Einrichtung "${altName}" nicht gefunden.`);
    }
    const { error } = await supabase
      .from("einrichtungen")
      .update({
        name: neuerName,
        trager_id: villaTragerId,
        vollzeit_wochenstunden: 39,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    console.log(`Einrichtung "${existing.name}" -> "${neuerName}" verschoben.`);
    return existing.id;
  }

  const nrwEinrichtungId = await moveAndRenameEinrichtung(
    "Testkita NRW",
    "Testkita NRW (Demo)"
  );
  const bwEinrichtungId = await moveAndRenameEinrichtung(
    "Testkita BW",
    "Testkita BW (Demo)"
  );

  // 3. Dritte Demo-Kita Bayern anlegen.
  let { data: byEinrichtung } = await supabase
    .from("einrichtungen")
    .select("id")
    .eq("name", "Testkita Bayern (Demo)")
    .maybeSingle();
  if (!byEinrichtung) {
    const { data, error } = await supabase
      .from("einrichtungen")
      .insert({
        name: "Testkita Bayern (Demo)",
        trager_id: villaTragerId,
        bundesland_code: "by",
        address_city: "München",
        vollzeit_wochenstunden: 39,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Insert fehlgeschlagen");
    byEinrichtung = data;
    console.log("Einrichtung \"Testkita Bayern (Demo)\" angelegt.");
  } else {
    console.log("Einrichtung \"Testkita Bayern (Demo)\" existiert bereits.");
  }
  const byEinrichtungId = byEinrichtung.id;

  const demoEinrichtungIds = [byEinrichtungId, nrwEinrichtungId, bwEinrichtungId];

  // 4. Max + Katrin auf Villa Kunterbunts Träger umziehen.
  async function updateProfil(
    email: string,
    fields: Partial<Database["public"]["Tables"]["user_profiles"]["Update"]>
  ) {
    const { data: profil, error } = await supabase
      .from("user_profiles")
      .update(fields)
      .eq("email", email)
      .select("id")
      .single();
    if (error || !profil) throw new Error(error?.message ?? `Update für ${email} fehlgeschlagen`);
    return profil.id;
  }

  await updateProfil("max@bellegio.test", { trager_id: villaTragerId });
  console.log("Max' Träger auf Villa Kunterbunt umgestellt.");

  const katrinId = await updateProfil("katrin@bellegio.test", {
    trager_id: villaTragerId,
    role: "mitarbeiter",
  });
  console.log("Katrins Rolle auf 'mitarbeiter' + Träger auf Villa Kunterbunt umgestellt.");

  // Katrin bekommt gezielt volle Rechte NUR für die 3 Demo-Kitas.
  const BEREICHE = ["belegung", "personal", "controlling", "szenario"] as const;
  const katrinRechte = demoEinrichtungIds.flatMap((einrichtungId) =>
    BEREICHE.map((bereich) => ({
      user_id: katrinId,
      einrichtung_id: einrichtungId,
      bereich,
      zugriff: "bearbeiten" as const,
    }))
  );
  const { error: rechteError } = await supabase
    .from("einrichtung_berechtigungen")
    .upsert(katrinRechte, { onConflict: "user_id,einrichtung_id,bereich" });
  if (rechteError) throw new Error(rechteError.message);
  console.log("Katrins Rechte für die 3 Demo-Kitas gesetzt (alle Bereiche/bearbeiten).");

  // 5. Gruppen-Helfer.
  type GruppeFields = {
    gruppenart: string;
    sollplatze: number;
    nrw_gruppenform?: string;
    nrw_buchungszeit_stunden?: number;
    bw_betriebsform?: string;
    bw_altersmischung?: boolean;
    bw_oeffnungszeit_stunden?: number;
  };

  async function findOrCreateGruppe(
    einrichtungId: string,
    name: string,
    fields: GruppeFields
  ) {
    const { data: existing } = await supabase
      .from("gruppen")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("name", name)
      .maybeSingle();
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("gruppen")
      .insert({ einrichtung_id: einrichtungId, name, ...fields })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Gruppe-Insert fehlgeschlagen");
    console.log(`  Gruppe "${name}" angelegt.`);
    return data.id;
  }

  // 6. Kind-Helfer.
  async function findOrCreateKind(
    einrichtungId: string,
    gruppeId: string,
    vorname: string,
    nachname: string,
    extra: Partial<Database["public"]["Tables"]["kinder"]["Insert"]>
  ): Promise<{ id: string; created: boolean }> {
    const { data: existing } = await supabase
      .from("kinder")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .maybeSingle();
    if (existing) return { id: existing.id, created: false };

    const { data, error } = await supabase
      .from("kinder")
      .insert({
        einrichtung_id: einrichtungId,
        gruppe_id: gruppeId,
        vorname,
        nachname,
        geburtsdatum: "2022-01-01",
        geschlecht: "keine_angabe",
        status: "aktiv",
        eintritt: "2025-09-01",
        ...extra,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Kind-Insert fehlgeschlagen");
    console.log(`  Kind "${vorname} ${nachname}" angelegt.`);
    return { id: data.id, created: true };
  }

  // 7. Team-Helfer.
  async function findOrCreateTeam(
    einrichtungId: string,
    gruppeId: string,
    vorname: string,
    nachname: string,
    roleCategory: "fk" | "ek",
    wochenstunden: number
  ) {
    const { data: existing } = await supabase
      .from("team")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .maybeSingle();
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("team")
      .insert({
        einrichtung_id: einrichtungId,
        gruppe_id: gruppeId,
        vorname,
        nachname,
        rolle: roleCategory === "fk" ? "Pädagogische Fachkraft" : "Ergänzungskraft",
        role_category: roleCategory,
        fachkraft: roleCategory === "fk",
        wochenstunden,
        status: "aktiv",
        eintritt: "2024-09-01",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Team-Insert fehlgeschlagen");
    console.log(`  Personal "${vorname} ${nachname}" (${roleCategory}, ${wochenstunden}h) angelegt.`);
    return data.id;
  }

  // ---- NRW: 2 weitere Gruppen (Gruppe I existiert schon aus Milestone 8) ----
  const nrwGruppeIIId = await findOrCreateGruppe(nrwEinrichtungId, "Gruppe II", {
    gruppenart: "krippe",
    sollplatze: 10,
    nrw_gruppenform: "II",
    nrw_buchungszeit_stunden: 25,
  });
  const nrwGruppeIIIId = await findOrCreateGruppe(nrwEinrichtungId, "Gruppe III", {
    gruppenart: "kindergarten",
    sollplatze: 20,
    nrw_gruppenform: "III",
    nrw_buchungszeit_stunden: 45,
  });

  // Personal Gruppe I (bestehend, GF I @ 35 Std./Wo. -> Soll-FK 77+7=84)
  const { data: nrwGruppeI } = await supabase
    .from("gruppen")
    .select("id")
    .eq("einrichtung_id", nrwEinrichtungId)
    .eq("name", "Gruppe I")
    .single();
  if (nrwGruppeI) {
    await findOrCreateTeam(nrwEinrichtungId, nrwGruppeI.id, "Nina", "Keller", "fk", 30);
    await findOrCreateTeam(nrwEinrichtungId, nrwGruppeI.id, "Jan", "Pohl", "fk", 30);
    await findOrCreateTeam(nrwEinrichtungId, nrwGruppeI.id, "Laura", "Busch", "fk", 24);
  }

  // Personal Gruppe II (GF II @ 25 Std./Wo. -> Soll-FK 55+5=60)
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIId, "Kevin", "Roth", "fk", 30);
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIId, "Sandra", "Voss", "fk", 30);

  // Personal Gruppe III (GF III @ 45 Std./Wo. -> Soll-FK 49,5+9=58,5, Soll-EK 49,5)
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIIId, "Miriam", "Graf", "fk", 30);
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIIId, "Daniel", "Horn", "fk", 28.5);
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIIId, "Petra", "Lorenz", "ek", 25);
  await findOrCreateTeam(nrwEinrichtungId, nrwGruppeIIIId, "Frank", "Bergmann", "ek", 24.5);

  // Kinder Gruppe II (U3-Krippe)
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIId, "Ben", "Hoffmann", { geburtsdatum: "2025-02-01" });
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIId, "Ida", "Schulz", { geburtsdatum: "2024-11-01" });
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIId, "Noah", "Weber", { geburtsdatum: "2025-05-01" });

  // Kinder Gruppe III (Ü3)
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIIId, "Emma", "Koch", { geburtsdatum: "2021-03-01" });
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIIId, "Luca", "Richter", { geburtsdatum: "2020-08-01" });
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIIId, "Mila", "Klein", { geburtsdatum: "2021-11-01" });
  await findOrCreateKind(nrwEinrichtungId, nrwGruppeIIIId, "Paul", "Wolf", { geburtsdatum: "2020-01-01" });

  // ---- BW: 2 weitere Gruppen (Regelgruppe existiert schon aus Milestone 8) ----
  const bwGanztagsgruppeId = await findOrCreateGruppe(bwEinrichtungId, "Ganztagsgruppe", {
    gruppenart: "kindergarten",
    sollplatze: 20,
    bw_betriebsform: "ganztagsgruppe",
    bw_altersmischung: false,
    bw_oeffnungszeit_stunden: 7,
  });
  const bwKinderkrippeId = await findOrCreateGruppe(bwEinrichtungId, "Kinderkrippe", {
    gruppenart: "krippe",
    sollplatze: 10,
    bw_betriebsform: "kinderkrippe",
    bw_altersmischung: false,
    bw_oeffnungszeit_stunden: 7,
  });

  // Personal Regelgruppe (bestehend, 1,8 VZÄ @ 39 Std. Referenz -> ~70,2 Std.)
  const { data: bwRegelgruppe } = await supabase
    .from("gruppen")
    .select("id")
    .eq("einrichtung_id", bwEinrichtungId)
    .eq("name", "Regelgruppe")
    .single();
  if (bwRegelgruppe) {
    await findOrCreateTeam(bwEinrichtungId, bwRegelgruppe.id, "Claudia", "Herzog", "fk", 39);
    await findOrCreateTeam(bwEinrichtungId, bwRegelgruppe.id, "Michael", "Freund", "fk", 31);
  }

  // Personal Ganztagsgruppe (2,3 VZÄ -> ~89,7 Std.)
  await findOrCreateTeam(bwEinrichtungId, bwGanztagsgruppeId, "Stefanie", "Adler", "fk", 39);
  await findOrCreateTeam(bwEinrichtungId, bwGanztagsgruppeId, "Oliver", "Pape", "fk", 39);
  await findOrCreateTeam(bwEinrichtungId, bwGanztagsgruppeId, "Nadine", "Böhm", "fk", 12);

  // Personal Kinderkrippe (2,06 VZÄ -> ~80,3 Std.)
  await findOrCreateTeam(bwEinrichtungId, bwKinderkrippeId, "Katharina", "Wolff", "fk", 30);
  await findOrCreateTeam(bwEinrichtungId, bwKinderkrippeId, "Tobias", "Reimann", "fk", 30);
  await findOrCreateTeam(bwEinrichtungId, bwKinderkrippeId, "Julia", "Brandt", "fk", 20);

  // Kinder Ganztagsgruppe
  await findOrCreateKind(bwEinrichtungId, bwGanztagsgruppeId, "Anna", "Zimmer", { geburtsdatum: "2021-04-01" });
  await findOrCreateKind(bwEinrichtungId, bwGanztagsgruppeId, "Tim", "Braun", { geburtsdatum: "2020-09-01" });
  await findOrCreateKind(bwEinrichtungId, bwGanztagsgruppeId, "Lea", "Krüger", { geburtsdatum: "2021-12-01" });
  await findOrCreateKind(bwEinrichtungId, bwGanztagsgruppeId, "Elias", "Hofmann", { geburtsdatum: "2020-06-01" });

  // Kinder Kinderkrippe
  await findOrCreateKind(bwEinrichtungId, bwKinderkrippeId, "Mila", "Lange", { geburtsdatum: "2024-10-01" });
  await findOrCreateKind(bwEinrichtungId, bwKinderkrippeId, "Felix", "Schmitt", { geburtsdatum: "2025-01-01" });
  await findOrCreateKind(bwEinrichtungId, bwKinderkrippeId, "Greta", "Vogel", { geburtsdatum: "2024-07-01" });

  // ---- Bayern: 2 neue Gruppen (Krippe + Kindergarten) ----
  const byKrippeId = await findOrCreateGruppe(byEinrichtungId, "Krippengruppe", {
    gruppenart: "krippe",
    sollplatze: 12,
  });
  const byKindergartenId = await findOrCreateGruppe(byEinrichtungId, "Kindergartengruppe", {
    gruppenart: "kindergarten",
    sollplatze: 20,
  });

  await findOrCreateTeam(byEinrichtungId, byKrippeId, "Julia", "Vogt", "fk", 30);
  await findOrCreateTeam(byEinrichtungId, byKrippeId, "Max", "Berger", "fk", 18);
  await findOrCreateTeam(byEinrichtungId, byKindergartenId, "Sarah", "Lang", "fk", 25);
  await findOrCreateTeam(byEinrichtungId, byKindergartenId, "Tobias", "Sommer", "fk", 18);

  // Bayern-Referenzdaten für Buchungszeit/Gewichtung nachschlagen.
  const { data: byBookingBands } = await supabase
    .from("booking_time_bands")
    .select("id, label")
    .eq("bundesland_code", "by");
  const { data: byWeightingFactors } = await supabase
    .from("weighting_factors")
    .select("id, label")
    .eq("bundesland_code", "by");

  const bandId = (label: string) => {
    const band = (byBookingBands ?? []).find((b) => b.label === label);
    if (!band) throw new Error(`Buchungszeit-Band "${label}" nicht gefunden.`);
    return band.id;
  };
  const factorId = (label: string) => {
    const factor = (byWeightingFactors ?? []).find((f) => f.label === label);
    if (!factor) throw new Error(`Gewichtungsfaktor "${label}" nicht gefunden.`);
    return factor.id;
  };

  async function setWeightingFactor(kindId: string, created: boolean, label: string) {
    if (!created) return; // nur bei Neuanlage verknüpfen, kein Duplikat bei Re-Runs
    const { error } = await supabase
      .from("kind_weighting_factors")
      .insert({ kind_id: kindId, weighting_factor_id: factorId(label) });
    if (error) throw new Error(error.message);
  }

  // Krippe-Kinder (U3)
  const krippeKinder: [string, string, string][] = [
    ["Theo", "Schuster", "2024-12-01"],
    ["Frieda", "Bauer", "2025-02-01"],
    ["Anton", "Peters", "2024-09-01"],
    ["Marlene", "Otto", "2025-04-01"],
    ["Jakob", "Groß", "2024-11-01"],
    ["Clara", "Fuchs", "2025-01-01"],
  ];
  for (const [vorname, nachname, geburtsdatum] of krippeKinder) {
    const { id, created } = await findOrCreateKind(byEinrichtungId, byKrippeId, vorname, nachname, {
      geburtsdatum,
      buchungszeit_band_id: bandId("6-7h"),
    });
    await setWeightingFactor(id, created, "Kinder unter drei Jahren");
  }

  // Kindergarten-Kinder (Ü3, regulär)
  const kindergartenKinder: [string, string, string][] = [
    ["Nils", "Winter", "2021-05-01"],
    ["Sophie", "Kaiser", "2020-10-01"],
    ["Moritz", "Fischer", "2021-08-01"],
    ["Lina", "Herrmann", "2022-02-01"],
    ["David", "König", "2021-01-01"],
    ["Johanna", "Walter", "2020-06-01"],
    ["Samuel", "Neumann", "2022-04-01"],
    ["Amelie", "Krause", "2021-09-01"],
  ];
  for (const [vorname, nachname, geburtsdatum] of kindergartenKinder) {
    const { id, created } = await findOrCreateKind(byEinrichtungId, byKindergartenId, vorname, nachname, {
      geburtsdatum,
      buchungszeit_band_id: bandId("6-7h"),
    });
    await setWeightingFactor(id, created, "Kinder von drei Jahren bis Schuleintritt");
  }

  // Integrationskind
  {
    const { id, created } = await findOrCreateKind(
      byEinrichtungId,
      byKindergartenId,
      "Leon",
      "Lehmann",
      {
        geburtsdatum: "2021-07-01",
        buchungszeit_band_id: bandId("6-7h"),
        hat_behinderung: true,
      }
    );
    await setWeightingFactor(id, created, "Integrationskinder");
  }

  // Schulkind
  {
    const { id, created } = await findOrCreateKind(
      byEinrichtungId,
      byKindergartenId,
      "Emilia",
      "Schwarz",
      {
        geburtsdatum: "2019-05-01",
        buchungszeit_band_id: bandId("6-7h"),
      }
    );
    await setWeightingFactor(id, created, "Schulkinder");
  }

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
