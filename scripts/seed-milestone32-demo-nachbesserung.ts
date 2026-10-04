/**
 * Milestone 32, Nachbesserung der Demo-Daten (nach der Auffüllung der Testkita Bayern in Milestone 31):
 *  - Testkita Bayern: drei zusätzliche Fachkräfte, damit der Anstellungsschlüssel heute im grünen Bereich liegt
 *    (ca. 1:9,3). Eine davon ist befristet bis 31.03.2027 — zusammen mit Julia Vogts Austritt kippt der Schlüssel dadurch
 *    wie in der Demo vorgesehen ab April 2027 auf rot.
 *  - (NRW-Förderbetrag: früher hier als manueller Wert gesetzt; seit der Migration 20261004100000_nrw_kindpauschalen_2026_27
 *    sind alle Kindpauschalen hinterlegt, die NRW-Demo-Kitas rechnen ohne Override.)
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone32-demo-nachbesserung.ts
 * Idempotent (Personal per Vor-/Nachname). Danach Demo ableiten: scripts/demo-einrichten.ts
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const NEUE_FACHKRAEFTE = [
  { vorname: "Anna", nachname: "Kellner", rolle: "Erzieherin", stunden: 39, eintritt: "2022-09-01", austritt: null, stufe: 4 },
  { vorname: "Lisa", nachname: "Brunner", rolle: "Erzieherin", stunden: 30, eintritt: "2023-09-01", austritt: null, stufe: 3 },
  { vorname: "Peter", nachname: "Aigner", rolle: "Pädagogische Fachkraft (befristet)", stunden: 30, eintritt: "2025-09-01", austritt: "2027-03-31", stufe: 2 },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  const sb = createClient<Database>(url, key);

  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!traeger) throw new Error("Träger Villa Kunterbunt nicht gefunden.");

  const { data: bayern } = await sb.from("einrichtungen").select("id").eq("trager_id", traeger.id).eq("name", "Testkita Bayern").single();
  if (!bayern) throw new Error("Testkita Bayern nicht gefunden.");
  const { data: gruppen } = await sb.from("gruppen").select("id, gruppenart").eq("einrichtung_id", bayern.id);
  const kindergarten = gruppen?.find((g) => g.gruppenart === "kindergarten")?.id ?? null;

  for (const p of NEUE_FACHKRAEFTE) {
    let { data: person } = await sb.from("team").select("id").eq("einrichtung_id", bayern.id).eq("vorname", p.vorname).eq("nachname", p.nachname).maybeSingle();
    if (!person) {
      const { data: neu, error } = await sb
        .from("team")
        .insert({
          einrichtung_id: bayern.id,
          gruppe_id: kindergarten,
          vorname: p.vorname,
          nachname: p.nachname,
          rolle: p.rolle,
          wochenstunden: p.stunden,
          fachkraft: true,
          status: "aktiv",
          eintritt: p.eintritt,
          austritt: p.austritt,
          role_category: "fk",
        })
        .select("id")
        .single();
      if (error || !neu) throw new Error(`${p.vorname} ${p.nachname}: ${error?.message}`);
      person = neu;
      console.log(`Angelegt: ${p.vorname} ${p.nachname}`);
    }
    const { error: ve } = await sb
      .from("team_verguetung")
      .upsert({ team_id: person.id, einrichtung_id: bayern.id, entgeltgruppe: "S8a", stufe: p.stufe, monatsgehalt_manuell: null }, { onConflict: "team_id" });
    if (ve) throw new Error(`Vergütung ${p.nachname}: ${ve.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
