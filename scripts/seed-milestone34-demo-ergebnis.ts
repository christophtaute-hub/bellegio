/**
 * Milestone 34: Demo-Daten so einstellen, dass Bellegio PROFITABLE und KRITISCHE Einrichtungen zeigt — aus echten Zahlen,
 * ohne Tricks an der Berechnung (kein manueller Förderbetrag).
 *
 *  - Testkita Bayern: schlanker besetzt (weniger Überbesetzung), moderate Sachkosten → im Plus.
 *  - Kita Sonnenschein: sechs Kindergartenkinder sind zum 30.09.2026 ausgetreten (Auslastung 31/37 = 84 %), das Team ist
 *    unverändert groß, Sachkosten 3.500 € → Belegung rot, Ergebnis im Minus.
 *
 * Läuft auf dem Quell-Träger (Villa Kunterbunt). Danach `scripts/demo-einrichten.ts` laufen lassen (kopiert in „Bellegio Demo“).
 *   npx tsx --env-file=.env.local scripts/seed-milestone34-demo-ergebnis.ts
 * Idempotent: erneutes Ausführen setzt dieselben Werte.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TRAEGER = "Villa Kunterbunt";

async function einrichtungId(name: string): Promise<string> {
  const { data: t } = await supabase.from("trager").select("id").eq("name", TRAEGER).single();
  const { data: e } = await supabase.from("einrichtungen").select("id").eq("name", name).eq("trager_id", t!.id).single();
  return e!.id;
}

async function main() {
  const sonnenschein = await einrichtungId("Kita Sonnenschein");
  const testkita = await einrichtungId("Testkita Bayern");

  // Sonnenschein: sechs Abgänge zum 30.09.2026 (Umzug, Wechsel zu anderer Einrichtung)
  const abgaenge = [
    ["Tim", "Conrad"],
    ["Clara", "Fink"],
    ["Lotta", "Lorenz"],
    ["Philipp", "Gruber"],
    ["Henry", "Pohl"],
    ["Lina", "Dorn"],
  ];
  for (const [vorname, nachname] of abgaenge) {
    const { error } = await supabase
      .from("kinder")
      .update({ austritt: "2026-09-30" })
      .eq("einrichtung_id", sonnenschein)
      .eq("vorname", vorname)
      .eq("nachname", nachname);
    if (error) throw error;
  }
  await supabase.from("einrichtungen").update({ sonstige_kosten_monatlich: 3500 }).eq("id", sonnenschein);

  // Testkita Bayern: weniger Überbesetzung, moderate Sachkosten
  for (const nachname of ["Lehner", "Reuter"]) {
    await supabase.from("team").update({ wochenstunden: 20 }).eq("einrichtung_id", testkita).eq("nachname", nachname);
  }
  const { data: berger } = await supabase.from("team").select("id").eq("einrichtung_id", testkita).eq("nachname", "Berger").single();
  const { data: sommer } = await supabase.from("team").select("id").eq("einrichtung_id", testkita).eq("nachname", "Sommer").single();
  await supabase.from("team_verguetung").update({ monatsgehalt_manuell: 2900 }).eq("team_id", berger!.id);
  await supabase.from("team_verguetung").update({ stufe: 5 }).eq("team_id", sommer!.id);
  await supabase.from("einrichtungen").update({ sonstige_kosten_monatlich: 1200 }).eq("id", testkita);
  // Belegungs-Ampel: Testkita Bayern voll belegt (Nachrücker ersetzt einen Abgang zum Jahreswechsel),
  // Testkita Baden-Württemberg ohne freie Plätze — Sonnenschein und Testkita NRW bleiben unterbelegt (rot).
  const { data: kigaGruppe } = await supabase.from("gruppen").select("id").eq("einrichtung_id", testkita).eq("gruppenart", "kindergarten").single();
  const { data: abgang } = await supabase
    .from("kinder")
    .select("id")
    .eq("gruppe_id", kigaGruppe!.id)
    .eq("status", "aktiv")
    .gte("austritt", "2027-06-30")
    .order("austritt", { ascending: true })
    .limit(1)
    .single();
  const { data: mira } = await supabase.from("kinder").select("id").eq("einrichtung_id", testkita).eq("vorname", "Mira").eq("nachname", "Albrecht").single();
  if (abgang && mira) {
    await supabase.from("kinder").update({ austritt: "2026-12-31" }).eq("id", abgang.id);
    await supabase.from("kinder").update({ eintritt: "2027-01-01", ersetzt_kind_id: abgang.id }).eq("id", mira.id);
  }
  const bw = await einrichtungId("Testkita Baden-Württemberg");
  await supabase.from("gruppen").update({ sollplatze: 18 }).eq("einrichtung_id", bw).eq("name", "Ganztagsgruppe");
  await supabase.from("gruppen").update({ sollplatze: 17 }).eq("einrichtung_id", bw).eq("name", "Regelgruppe");
  console.log("Demo-Ergebnis-Daten gesetzt. Jetzt: npx tsx --env-file=.env.local scripts/demo-einrichten.ts");
}
main();
