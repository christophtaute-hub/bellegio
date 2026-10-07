/**
 * Milestone 33, Phase 5a: Demo-Preisliste (Elternbeiträge je Buchungszeit-Band) für alle Einrichtungen des Quell-Trägers
 * "Villa Kunterbunt". Die Demo ("Bellegio Demo") bekommt sie über scripts/demo-einrichten.ts.
 * Preise sind erfundene Beispielwerte: 60 € Sockel + 5,50 € je Wochenstunde, auf 5 € gerundet (Bayern-Bänder sind Tagesstunden × 5).
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone33-beitraege.ts
 * Idempotent: ersetzt die Fassung "gültig ab 2000-01-01" je Einrichtung.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!traeger) throw new Error("Träger 'Villa Kunterbunt' fehlt.");
  const { data: einrichtungen } = await sb.from("einrichtungen").select("id, name, bundesland_code").eq("trager_id", traeger.id).is("archived_at", null);
  for (const e of einrichtungen ?? []) {
    const { data: baender } = await sb.from("booking_time_bands").select("id, min_hours").eq("bundesland_code", e.bundesland_code);
    await sb.from("einrichtung_beitraege").delete().eq("einrichtung_id", e.id).eq("gueltig_ab", "2000-01-01");
    const zeilen = (baender ?? []).map((b) => {
      const wochenstunden = e.bundesland_code === "by" ? Number(b.min_hours) * 5 : Number(b.min_hours);
      return {
        einrichtung_id: e.id,
        booking_time_band_id: b.id,
        betrag_monat: Math.round((60 + wochenstunden * 5.5) / 5) * 5,
        gueltig_ab: "2000-01-01",
      };
    });
    const { error } = await sb.from("einrichtung_beitraege").insert(zeilen);
    if (error) throw new Error(error.message);
    console.log(`${e.name}: ${zeilen.length} Preise`);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
