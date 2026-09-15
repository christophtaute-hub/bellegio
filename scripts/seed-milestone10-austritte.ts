/**
 * Milestone 10, Phase P: ergänzt bei allen Demo-Kindern (Testkita NRW/BW/
 * Bayern (Demo)) ohne gesetztes Austrittsdatum ein realistisches, nach den
 * üblichen deutschen Kita-Übergängen berechnetes Datum — Krippe/U3-Kinder
 * wechseln mit 3 Jahren in den Kindergarten, Kindergarten/Ü3-Kinder werden
 * mit 6 Jahren eingeschult, jeweils auf den nächsten 1. September gerundet
 * (Kita-Jahr-Wechsel). Rührt NICHT an echten Einrichtungen (nur an den drei
 * "(Demo)"-Kitas) und lässt bereits gesetzte Austrittsdaten unangetastet.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone10-austritte.ts
 * Idempotent (überspringt Kinder mit bereits gesetztem austritt).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const DEMO_EINRICHTUNGEN = [
  "Testkita Bayern (Demo)",
  "Testkita NRW (Demo)",
  "Testkita BW (Demo)",
];

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Nächster 1. September auf oder nach dem übergebenen Datum. */
function naechsterSeptember(date: Date): Date {
  const jahr = date.getUTCFullYear();
  const sept1DiesesJahr = new Date(Date.UTC(jahr, 8, 1));
  if (date <= sept1DiesesJahr) return sept1DiesesJahr;
  return new Date(Date.UTC(jahr + 1, 8, 1));
}

function austrittsdatum(geburtsdatum: string, jahreBisUebergang: number): string {
  const uebergang = parseIsoDate(geburtsdatum);
  uebergang.setUTCFullYear(uebergang.getUTCFullYear() + jahreBisUebergang);
  return toIsoDateString(naechsterSeptember(uebergang));
}

/**
 * Ein aktives Kind, das altersmäßig die reguläre Übergangsstufe schon
 * (knapp) überschritten hat — z.B. weil der berechnete 1. September genau
 * in der jüngsten Vergangenheit liegt, oder ein Schulkind längst über 6
 * ist — bekäme sonst ein Austrittsdatum in der Vergangenheit, obwohl es
 * laut Status noch aktiv ist. Schrittweise auf den nächstmöglichen
 * künftigen Übergangszyklus (+1 Kitajahr) weiterrücken, bis das Datum
 * nach "heute" liegt.
 */
function austrittsdatumZukunftssicher(
  geburtsdatum: string,
  jahreBisUebergang: number,
  heute: Date
): string {
  let jahre = jahreBisUebergang;
  let austritt = austrittsdatum(geburtsdatum, jahre);
  while (parseIsoDate(austritt) <= heute) {
    jahre += 1;
    austritt = austrittsdatum(geburtsdatum, jahre);
  }
  return austritt;
}

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
    .in("name", DEMO_EINRICHTUNGEN);
  if (einrichtungenError) throw new Error(einrichtungenError.message);
  if (!einrichtungen || einrichtungen.length !== 3) {
    throw new Error(
      `Erwartete 3 Demo-Einrichtungen, gefunden: ${einrichtungen?.length ?? 0}. Erst Milestone 9 seeden.`
    );
  }
  const einrichtungIds = einrichtungen.map((e) => e.id);

  const { data: kinder, error: kinderError } = await supabase
    .from("kinder")
    .select(
      "id, vorname, nachname, geburtsdatum, austritt, gruppe_id, gruppen(gruppenart, nrw_gruppenform, bw_betriebsform)"
    )
    .in("einrichtung_id", einrichtungIds)
    .is("austritt", null)
    .eq("status", "aktiv");
  if (kinderError) throw new Error(kinderError.message);

  const heute = new Date();

  let aktualisiert = 0;
  for (const kind of kinder ?? []) {
    const gruppe = kind.gruppen;
    if (!gruppe) continue;

    const istKrippe =
      gruppe.gruppenart === "krippe" ||
      gruppe.nrw_gruppenform === "II" ||
      gruppe.bw_betriebsform === "kinderkrippe";

    const austritt = austrittsdatumZukunftssicher(
      kind.geburtsdatum,
      istKrippe ? 3 : 6,
      heute
    );

    const { error } = await supabase
      .from("kinder")
      .update({ austritt })
      .eq("id", kind.id);
    if (error) throw new Error(error.message);

    console.log(
      `  "${kind.vorname} ${kind.nachname}" -> Austritt ${austritt} (${istKrippe ? "Krippe->Kiga" : "Kiga->Schule"})`
    );
    aktualisiert++;
  }

  console.log(`\nFertig. ${aktualisiert} Kinder aktualisiert.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
