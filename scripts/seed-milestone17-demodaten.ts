/**
 * Milestone 17, Phase Y1: macht die Demo-Kinder der 3 Testkitas realistischer.
 *
 * - Geschlecht für alle Kinder (vorher fast überall "keine_angabe")
 * - Nachrücker mit Eintrittsdatum (+ je Kita ein weiterer Nachrücker in der
 *   vollen Gruppe, als Material für die spätere Belegungs-Vorschau)
 * - Unterschiedliche Buchungszeiten statt einheitlich "6-7h" bzw. ohne Band
 * - I-Status-Kinder auch in BW und NRW (sonst zeigt die neue
 *   Kalenderjahr-Kategorisierung dort nur Nullen)
 * - Bewegung im Kalenderjahr 2026 (Eintritte Jan/Mär/Sep, ein Austritt Dez),
 *   damit die Monatsansicht nicht flach ist
 *
 * Der Bayern-Anstellungsschlüssel hängt nur an den Gewichtungsfaktoren, nicht
 * an der Buchungszeit — die April-2027-Demo (grün bis März, rot ab April)
 * bleibt dadurch erhalten (nach dem Lauf gegenprüfen).
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone17-demodaten.ts
 * Idempotent (Lookups per Einrichtung + Vor-/Nachname).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type KindPatch = Partial<Database["public"]["Tables"]["kinder"]["Update"]>;
type Geschlecht = "maennlich" | "weiblich";

const GESCHLECHT_NACH_VORNAME: Record<string, Geschlecht> = {
  Elias: "maennlich",
  Tim: "maennlich",
  Anna: "weiblich",
  Lea: "weiblich",
  Greta: "weiblich",
  Mila: "weiblich",
  Felix: "maennlich",
  Mia: "weiblich",
  Jonas: "maennlich",
  Emilia: "weiblich",
  Johanna: "weiblich",
  Sophie: "weiblich",
  David: "maennlich",
  Nils: "maennlich",
  Leon: "maennlich",
  Moritz: "maennlich",
  Amelie: "weiblich",
  Lina: "weiblich",
  Samuel: "maennlich",
  Anton: "maennlich",
  Jakob: "maennlich",
  Theo: "maennlich",
  Clara: "weiblich",
  Frieda: "weiblich",
  Marlene: "weiblich",
  Finn: "maennlich",
  Lena: "weiblich",
  Ida: "weiblich",
  Ben: "maennlich",
  Noah: "maennlich",
  Paul: "maennlich",
  Luca: "maennlich",
  Emma: "weiblich",
};

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
    .select("id, name, bundesland_code")
    .in("name", ["Testkita Bayern", "Testkita Baden-Württemberg", "Testkita Nordrhein-Westfalen"]);
  if (einrichtungenError) throw new Error(einrichtungenError.message);
  const byKita = einrichtungen?.find((e) => e.name === "Testkita Bayern");
  const bwKita = einrichtungen?.find((e) => e.name === "Testkita Baden-Württemberg");
  const nrwKita = einrichtungen?.find((e) => e.name === "Testkita Nordrhein-Westfalen");
  if (!byKita || !bwKita || !nrwKita) throw new Error("Demo-Einrichtungen nicht vollständig gefunden.");

  const { data: bands, error: bandsError } = await supabase
    .from("booking_time_bands")
    .select("id, label, bundesland_code");
  if (bandsError) throw new Error(bandsError.message);
  function bandId(bundesland: string, label: string): string {
    const band = bands?.find((b) => b.bundesland_code === bundesland && b.label === label);
    if (!band) throw new Error(`Band "${label}" (${bundesland}) nicht gefunden.`);
    return band.id;
  }

  async function gruppeId(einrichtungId: string, name: string): Promise<string> {
    const { data, error } = await supabase
      .from("gruppen")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("name", name)
      .single();
    if (error || !data) throw new Error(`Gruppe "${name}" nicht gefunden.`);
    return data.id;
  }

  async function patchKind(einrichtungId: string, vorname: string, nachname: string, patch: KindPatch) {
    const { data, error } = await supabase
      .from("kinder")
      .update(patch)
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .select("id");
    if (error) throw new Error(`${vorname} ${nachname}: ${error.message}`);
    if (!data || data.length !== 1) throw new Error(`${vorname} ${nachname}: ${data?.length ?? 0} Treffer statt 1.`);
  }

  async function ensureNachruecker(
    einrichtungId: string,
    gruppe: string,
    vorname: string,
    nachname: string,
    fields: Database["public"]["Tables"]["kinder"]["Insert"]
  ) {
    const { data: existing } = await supabase
      .from("kinder")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("kinder").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await supabase.from("kinder").insert({ ...fields, gruppe_id: await gruppeId(einrichtungId, gruppe) });
    if (error) throw new Error(error.message);
    console.log(`  Nachrücker "${vorname} ${nachname}" angelegt.`);
  }

  // ---- 1. Geschlecht für alle Kinder mit "keine_angabe" ----
  console.log("Geschlecht setzen …");
  const { data: ohneGeschlecht, error: ohneGeschlechtError } = await supabase
    .from("kinder")
    .select("id, vorname, nachname")
    .in("einrichtung_id", [byKita.id, bwKita.id, nrwKita.id])
    .eq("geschlecht", "keine_angabe")
    .is("archived_at", null);
  if (ohneGeschlechtError) throw new Error(ohneGeschlechtError.message);
  for (const kind of ohneGeschlecht ?? []) {
    const geschlecht = GESCHLECHT_NACH_VORNAME[kind.vorname];
    if (!geschlecht) throw new Error(`Kein Geschlecht hinterlegt für "${kind.vorname}".`);
    const { error } = await supabase.from("kinder").update({ geschlecht }).eq("id", kind.id);
    if (error) throw new Error(error.message);
  }
  console.log(`  ${ohneGeschlecht?.length ?? 0} Kinder aktualisiert.`);

  // ---- 2. Bayern (tägliche Bänder) ----
  console.log("Bayern: Buchungszeiten, Bewegung, Nachrücker …");
  const by = (label: string) => bandId("by", label);
  const bayernBaender: [string, string, string][] = [
    ["Emilia", "Schwarz", "6-7h"],
    ["Johanna", "Walter", "5-6h"],
    ["Sophie", "Kaiser", "7-8h"],
    ["David", "König", "6-7h"],
    ["Nils", "Winter", "4-5h"],
    ["Leon", "Lehmann", "7-8h"],
    ["Moritz", "Fischer", "5-6h"],
    ["Amelie", "Krause", "6-7h"],
    ["Lina", "Herrmann", "4-5h"],
    ["Samuel", "Neumann", "8-9h"],
    ["Anton", "Peters", "7-8h"],
    ["Jakob", "Groß", "8-9h"],
    ["Theo", "Schuster", "6-7h"],
    ["Clara", "Fuchs", "7-8h"],
    ["Frieda", "Bauer", "8-9h"],
    ["Marlene", "Otto", "6-7h"],
  ];
  for (const [vorname, nachname, label] of bayernBaender) {
    await patchKind(byKita.id, vorname, nachname, { buchungszeit_band_id: by(label) });
  }
  // Bewegung 2026: drei Krippenkinder sind unterjährig eingetreten, ein Kind zieht zum Jahresende weg.
  await patchKind(byKita.id, "Clara", "Fuchs", { eintritt: "2026-01-01" });
  await patchKind(byKita.id, "Frieda", "Bauer", { eintritt: "2026-03-01" });
  await patchKind(byKita.id, "Marlene", "Otto", { eintritt: "2026-09-01" });
  await patchKind(byKita.id, "Nils", "Winter", { austritt: "2026-12-31", notizen: "Umzug zum Jahresende." });
  await patchKind(byKita.id, "Mira", "Albrecht", { eintritt: "2026-11-01", buchungszeit_band_id: by("5-6h") });
  await ensureNachruecker(byKita.id, "Krippengruppe", "Ella", "Berger", {
    einrichtung_id: byKita.id,
    vorname: "Ella",
    nachname: "Berger",
    geburtsdatum: "2025-07-10",
    geschlecht: "weiblich",
    status: "nachruecker",
    eintritt: "2027-09-01",
    buchungszeit_band_id: by("7-8h"),
  });

  // ---- 3. Baden-Württemberg (wöchentliche Bänder) ----
  console.log("Baden-Württemberg: Buchungszeiten, I-Status, Bewegung, Nachrücker …");
  const bw = (label: string) => bandId("bw", label);
  const bwBaender: [string, string, string][] = [
    ["Elias", "Hofmann", "45,5h-50h"],
    ["Tim", "Braun", "35,5h-40h"],
    ["Anna", "Zimmer", "40,5h-45h"],
    ["Lea", "Krüger", "45,5h-50h"],
    ["Elif", "Kaya", "40,5h-45h"],
    ["Noah", "Frick", "35,5h-40h"],
    ["Selin", "Demir", "30,5h-35h"],
    ["Ida", "Sailer", "40,5h-45h"],
    ["Theo", "Maurer", "25,5h-30h"],
    ["Felix", "Schmitt", "20,5h-25h"],
    ["Mia", "Fischer", "25,5h-30h"],
    ["Jonas", "Becker", "30,5h-35h"],
  ];
  for (const [vorname, nachname, label] of bwBaender) {
    await patchKind(bwKita.id, vorname, nachname, { buchungszeit_band_id: bw(label) });
  }
  // Krippenkinder wechseln mit 3 Jahren zum nächsten 1. September in den Kindergarten.
  for (const [vorname, nachname] of [["Elif", "Kaya"], ["Noah", "Frick"], ["Selin", "Demir"], ["Ida", "Sailer"], ["Theo", "Maurer"]]) {
    await patchKind(bwKita.id, vorname, nachname, { austritt: "2027-09-01" });
  }
  await patchKind(bwKita.id, "Greta", "Vogel", { wohnort: "Stuttgart" });
  await patchKind(bwKita.id, "Mila", "Lange", { wohnort: "Stuttgart" });
  await patchKind(bwKita.id, "Felix", "Schmitt", { wohnort: "Stuttgart" });
  await patchKind(bwKita.id, "Ida", "Sailer", { eintritt: "2026-01-01" });
  await patchKind(bwKita.id, "Theo", "Maurer", { eintritt: "2026-03-01" });
  await patchKind(bwKita.id, "Selin", "Demir", { eintritt: "2026-09-01" });
  await patchKind(bwKita.id, "Jonas", "Becker", { austritt: "2026-12-31", notizen: "Umzug zum Jahresende." });
  await patchKind(bwKita.id, "Anna", "Zimmer", { hat_behinderung: true, notizen: "I-Status: Eingliederungshilfe beantragt." });
  await patchKind(bwKita.id, "Noah", "Frick", { hat_behinderung: true, notizen: "I-Status: Einzelfallhilfe." });
  await ensureNachruecker(bwKita.id, "Kinderkrippe", "Karl", "Ziegler", {
    einrichtung_id: bwKita.id,
    vorname: "Karl",
    nachname: "Ziegler",
    geburtsdatum: "2025-05-02",
    geschlecht: "maennlich",
    status: "nachruecker",
    eintritt: "2027-09-01",
    wohnort: "Stuttgart",
    buchungszeit_band_id: bw("35,5h-40h"),
  });

  // ---- 4. NRW (Bänder 25/35/45) ----
  console.log("NRW: Buchungszeiten, I-Status, Bewegung, Nachrücker …");
  const nrw = (label: string) => bandId("nrw", label);
  const nrwBaender: [string, string, string][] = [
    ["Finn", "Schröder", "35h"],
    ["Lena", "Wagner", "45h"],
    ["Milan", "Weller", "35h"],
    ["Amira", "Celik", "45h"],
    ["Finja", "Neumann", "35h"],
    ["Zoe", "Brand", "25h"],
    ["Levi", "Schuster", "45h"],
    ["Ida", "Schulz", "25h"],
    ["Ben", "Hoffmann", "35h"],
    ["Noah", "Weber", "25h"],
    ["Paul", "Wolf", "45h"],
    ["Luca", "Richter", "45h"],
    ["Emma", "Koch", "25h"],
    ["Mila", "Klein", "35h"],
  ];
  for (const [vorname, nachname, label] of nrwBaender) {
    await patchKind(nrwKita.id, vorname, nachname, { buchungszeit_band_id: nrw(label) });
  }
  for (const [vorname, nachname] of [["Milan", "Weller"], ["Amira", "Celik"], ["Finja", "Neumann"], ["Zoe", "Brand"], ["Levi", "Schuster"]]) {
    await patchKind(nrwKita.id, vorname, nachname, { austritt: "2027-09-01" });
  }
  await patchKind(nrwKita.id, "Finja", "Neumann", { eintritt: "2026-01-01" });
  await patchKind(nrwKita.id, "Levi", "Schuster", { eintritt: "2026-03-01" });
  await patchKind(nrwKita.id, "Zoe", "Brand", { eintritt: "2026-09-01" });
  await patchKind(nrwKita.id, "Emma", "Koch", { hat_behinderung: true, notizen: "I-Kind, Modell M1 (Zusatzkraft)." });
  await patchKind(nrwKita.id, "Noah", "Weber", { hat_behinderung: true, notizen: "I-Kind, Modell M2 (Gruppenstärkenabsenkung)." });
  await patchKind(nrwKita.id, "Ben", "Kraft", { eintritt: "2027-01-01", buchungszeit_band_id: nrw("35h") });
  await ensureNachruecker(nrwKita.id, "Gruppe II", "Lotta", "Engel", {
    einrichtung_id: nrwKita.id,
    vorname: "Lotta",
    nachname: "Engel",
    geburtsdatum: "2025-03-20",
    geschlecht: "weiblich",
    status: "nachruecker",
    eintritt: "2027-09-01",
    buchungszeit_band_id: nrw("35h"),
  });

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
