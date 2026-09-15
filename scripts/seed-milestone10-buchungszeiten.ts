/**
 * Milestone 10, Phase R: befüllt bei den NRW/BW-Demo-Kindern die pro Kind
 * erfasste Buchungszeit (kinder.buchungszeit_band_id), nachdem echte
 * Personalbelegungslisten bestätigt haben, dass NRW und BW das — anders
 * als ursprünglich angenommen — genau wie Bayern pro Kind erfassen (dort
 * "Zeitk." genannt), nicht nur auf Gruppenebene. Voraussetzung: die
 * Migration 20260916100000_nrw_bw_booking_time_bands.sql ist angewendet.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone10-buchungszeiten.ts
 * Idempotent (überschreibt nur Kinder ohne bereits gesetzten Wert).
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

  const { data: nrwBands, error: nrwBandsError } = await supabase
    .from("booking_time_bands")
    .select("id, label")
    .eq("bundesland_code", "nrw");
  if (nrwBandsError) throw new Error(nrwBandsError.message);
  const { data: bwBands, error: bwBandsError } = await supabase
    .from("booking_time_bands")
    .select("id, label")
    .eq("bundesland_code", "bw");
  if (bwBandsError) throw new Error(bwBandsError.message);

  const nrwBandId = (label: string) => {
    const band = (nrwBands ?? []).find((b) => b.label === label);
    if (!band) throw new Error(`NRW-Band "${label}" nicht gefunden.`);
    return band.id;
  };
  const bwBandId = (label: string) => {
    const band = (bwBands ?? []).find((b) => b.label === label);
    if (!band) throw new Error(`BW-Band "${label}" nicht gefunden.`);
    return band.id;
  };

  async function setBuchungszeit(vorname: string, nachname: string, bandId: string) {
    const { data, error } = await supabase
      .from("kinder")
      .update({ buchungszeit_band_id: bandId })
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .is("buchungszeit_band_id", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (data && data.length > 0) {
      console.log(`  "${vorname} ${nachname}" -> Buchungszeit gesetzt.`);
    }
  }

  // NRW: Gruppe I (35h-Gruppe), Gruppe II (Krippe, 25h), Gruppe III (Ü3, 35-45h)
  await setBuchungszeit("Lena", "Wagner", nrwBandId("35h"));
  await setBuchungszeit("Finn", "Schröder", nrwBandId("35h"));
  await setBuchungszeit("Ben", "Hoffmann", nrwBandId("25h"));
  await setBuchungszeit("Ida", "Schulz", nrwBandId("25h"));
  await setBuchungszeit("Noah", "Weber", nrwBandId("25h"));
  await setBuchungszeit("Emma", "Koch", nrwBandId("35h"));
  await setBuchungszeit("Luca", "Richter", nrwBandId("45h"));
  await setBuchungszeit("Mila", "Klein", nrwBandId("35h"));
  await setBuchungszeit("Paul", "Wolf", nrwBandId("45h"));

  // BW: Regelgruppe (~30h), Ganztagsgruppe (~45h), Kinderkrippe (~35-40h)
  await setBuchungszeit("Mia", "Fischer", bwBandId("30,5h-35h"));
  await setBuchungszeit("Jonas", "Becker", bwBandId("30,5h-35h"));
  await setBuchungszeit("Anna", "Zimmer", bwBandId("40,5h-45h"));
  await setBuchungszeit("Tim", "Braun", bwBandId("45,5h-50h"));
  await setBuchungszeit("Lea", "Krüger", bwBandId("40,5h-45h"));
  await setBuchungszeit("Elias", "Hofmann", bwBandId("45,5h-50h"));
  await setBuchungszeit("Mila", "Lange", bwBandId("35,5h-40h"));
  await setBuchungszeit("Felix", "Schmitt", bwBandId("35,5h-40h"));
  await setBuchungszeit("Greta", "Vogel", bwBandId("35,5h-40h"));

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
