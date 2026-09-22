/**
 * Milestone 26: füllt die drei Testkitas realistisch auf ("ausreichend Personal und Kinder, um die Kita
 * vorzuzeigen") — die großen Gruppen standen bisher bei 10–25 % Auslastung (z.B. NRW Gruppe I: 2 von 20
 * Plätzen), was für eine Vorführung vor einer echten Kita zu leer wirkt.
 *
 * - Bayern (Kindergartengruppe): +7 Kinder, +2 Personal — bewusst eng aufeinander abgestimmt, damit der
 *   demonstrierte Anstellungsschlüssel-Bruch weiterhin genau zum 01.04.2027 passiert (Julia Vogts Austritt).
 *   Dabei fällt auf: Sarah Langs Schwangerschaft/Beschäftigungsverbot (seit 22.07.2026, ohne Ende) lässt
 *   `team_presence_for_month` ihre Stunden seitdem dauerhaft auf 0 zählen (siehe
 *   20260914163215_team_presence_status_fix_and_empfohlener_schluessel.sql) — dadurch war der Schlüssel
 *   schon ab September 2026 statt erst ab April 2027 rot. Eine der beiden neuen Personen ist deshalb eine
 *   Vertretung für Sarah Lang (realistische Reaktion einer echten Kita auf einen Langzeitausfall), die
 *   zweite eine reguläre neue Fachkraft für die zusätzlichen Kinder — zusammen ergeben sich wieder die
 *   ursprünglich gerechneten Werte 1:9,28 (grün, bis März 2027) und 1:12,85 (rot, ab April 2027) bei einer
 *   um 7 gewichtete Kinder höheren Kinderzahl (bewusst nachgerechnet, siehe Kommentar unten).
 * - Baden-Württemberg (Regelgruppe, Ganztagsgruppe): +14 / +13 Kinder, +1 Personal je Gruppe. Der
 *   BW-Personalschlüssel hängt nur an Betriebsform/Altersmischung/Öffnungszeit der Gruppe, nicht an der
 *   Kinderzahl (staffing_rules-unabhängig) — unkritisch für den Schlüssel, die zusätzliche Person ist rein
 *   für die optische Wirkung im Team-Bereich.
 * - NRW (Gruppe I, Gruppe III): +15 / +13 Kinder, kein zusätzliches Personal — die Formel ist ebenfalls
 *   gruppen-/nicht kopfzahlbasiert, und beide Gruppen haben bereits 3–4 Personen für die neue Kinderzahl.
 *
 * Jede Gruppe behält bewusst ein paar freie Plätze (Zielauslastung ~85 %), damit die "Freie Plätze"-Kachel
 * weiterhin etwas zu zeigen hat und nicht jede Gruppe randvoll wirkt.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone26-kapazitaet.ts
 * Idempotent: legt ein Kind/eine Person nur an, wenn noch kein Datensatz mit demselben Vor-/Nachnamen in
 * der jeweiligen Einrichtung existiert (Lookup wie in den früheren Milestone-Skripten).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type KindInsert = Database["public"]["Tables"]["kinder"]["Insert"];
type TeamInsert = Database["public"]["Tables"]["team"]["Insert"];

type NeuesKind = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: "maennlich" | "weiblich";
  buchungszeitLabel: string;
  wohnort?: string;
  eintritt?: string;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local).");
    process.exit(1);
  }
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data: einrichtungen, error: eError } = await supabase
    .from("einrichtungen")
    .select("id, name")
    .in("name", ["Testkita Bayern", "Testkita Baden-Württemberg", "Testkita Nordrhein-Westfalen"]);
  if (eError) throw new Error(eError.message);
  const byKita = einrichtungen?.find((e) => e.name === "Testkita Bayern");
  const bwKita = einrichtungen?.find((e) => e.name === "Testkita Baden-Württemberg");
  const nrwKita = einrichtungen?.find((e) => e.name === "Testkita Nordrhein-Westfalen");
  if (!byKita || !bwKita || !nrwKita) throw new Error("Demo-Einrichtungen nicht vollständig gefunden.");

  const { data: gruppen, error: gError } = await supabase
    .from("gruppen")
    .select("id, name, einrichtung_id")
    .in("einrichtung_id", [byKita.id, bwKita.id, nrwKita.id]);
  if (gError) throw new Error(gError.message);
  function gruppeId(einrichtungId: string, name: string): string {
    const g = gruppen?.find((g) => g.einrichtung_id === einrichtungId && g.name === name);
    if (!g) throw new Error(`Gruppe "${name}" nicht gefunden.`);
    return g.id;
  }

  const { data: bands, error: bError } = await supabase.from("booking_time_bands").select("id, label, bundesland_code");
  if (bError) throw new Error(bError.message);
  function bandId(bundesland: string, label: string): string {
    const band = bands?.find((b) => b.bundesland_code === bundesland && b.label === label);
    if (!band) throw new Error(`Band "${label}" (${bundesland}) nicht gefunden.`);
    return band.id;
  }

  const { data: weightingFactors, error: wError } = await supabase
    .from("weighting_factors")
    .select("id, code")
    .eq("bundesland_code", "by");
  if (wError) throw new Error(wError.message);
  const ue3FactorId = weightingFactors?.find((w) => w.code === "ue3_bis_schuleintritt")?.id;
  if (!ue3FactorId) throw new Error('Gewichtungsfaktor "ue3_bis_schuleintritt" nicht gefunden.');

  async function findKindId(einrichtungId: string, vorname: string, nachname: string): Promise<string | null> {
    const { data } = await supabase
      .from("kinder")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .maybeSingle();
    return data?.id ?? null;
  }

  /** Legt ein Kind nur an, wenn noch keins mit diesem Namen in der Einrichtung existiert — idempotent. */
  async function ensureKind(
    einrichtungId: string,
    gruppeId: string,
    kind: NeuesKind,
    extra?: Partial<KindInsert>
  ): Promise<{ id: string; neu: boolean }> {
    const bestehende = await findKindId(einrichtungId, kind.vorname, kind.nachname);
    if (bestehende) return { id: bestehende, neu: false };
    const insert: KindInsert = {
      einrichtung_id: einrichtungId,
      gruppe_id: gruppeId,
      vorname: kind.vorname,
      nachname: kind.nachname,
      geburtsdatum: kind.geburtsdatum,
      geschlecht: kind.geschlecht,
      status: "aktiv",
      eintritt: kind.eintritt ?? "2025-09-01",
      wohnort: kind.wohnort ?? null,
      ...extra,
    };
    const { data, error } = await supabase.from("kinder").insert(insert).select("id").single();
    if (error || !data) throw new Error(`${kind.vorname} ${kind.nachname}: ${error?.message}`);
    return { id: data.id, neu: true };
  }

  async function ensureTeam(einrichtungId: string, person: TeamInsert & { vorname: string; nachname: string }) {
    const { data: bestehende } = await supabase
      .from("team")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("vorname", person.vorname)
      .eq("nachname", person.nachname)
      .maybeSingle();
    if (bestehende) return { id: bestehende.id, neu: false };
    const { data, error } = await supabase.from("team").insert(person).select("id").single();
    if (error || !data) throw new Error(`${person.vorname} ${person.nachname}: ${error?.message}`);
    console.log(`  Personal "${person.vorname} ${person.nachname}" angelegt.`);
    return { id: data.id, neu: true };
  }

  // ==================== Bayern: Kindergartengruppe (11 → 18 von 20) ====================
  console.log("Bayern: Kindergartengruppe auffüllen …");
  const byKgId = gruppeId(byKita.id, "Kindergartengruppe");
  const bayernKinder: NeuesKind[] = [
    { vorname: "Julian", nachname: "Vogel", geburtsdatum: "2021-04-12", geschlecht: "maennlich", buchungszeitLabel: "6-7h" },
    { vorname: "Charlotte", nachname: "Reiter", geburtsdatum: "2020-08-30", geschlecht: "weiblich", buchungszeitLabel: "7-8h" },
    { vorname: "Tom", nachname: "Ludwig", geburtsdatum: "2021-11-05", geschlecht: "maennlich", buchungszeitLabel: "5-6h" },
    { vorname: "Leni", nachname: "Kraus", geburtsdatum: "2021-02-18", geschlecht: "weiblich", buchungszeitLabel: "6-7h", eintritt: "2026-01-01" },
    { vorname: "Mats", nachname: "Arnold", geburtsdatum: "2020-06-22", geschlecht: "maennlich", buchungszeitLabel: "7-8h" },
    { vorname: "Marie", nachname: "Beck", geburtsdatum: "2021-09-09", geschlecht: "weiblich", buchungszeitLabel: "6-7h", eintritt: "2026-03-01" },
    { vorname: "Henry", nachname: "Schreiber", geburtsdatum: "2020-12-01", geschlecht: "maennlich", buchungszeitLabel: "8-9h" },
  ];
  let byNeu = 0;
  for (const kind of bayernKinder) {
    const { id, neu } = await ensureKind(byKita.id, byKgId, kind, { buchungszeit_band_id: bandId("by", kind.buchungszeitLabel) });
    if (neu) {
      byNeu++;
      // Standard-Kindergartenkind (Ü3 bis Schuleintritt, Faktor 1,0) — ohne diese Zeile zählt das Kind mit 0 zur
      // gewichteten Kinderzahl und verfälscht den unten dokumentierten Anstellungsschlüssel-Abgleich.
      const { error } = await supabase.from("kind_weighting_factors").insert({ kind_id: id, weighting_factor_id: ue3FactorId });
      if (error) throw new Error(`Gewichtung ${kind.vorname} ${kind.nachname}: ${error.message}`);
      await supabase.from("kind_buchungszeit_historie").insert({
        kind_id: id,
        buchungszeit_band_id: bandId("by", kind.buchungszeitLabel),
        gueltig_ab: kind.eintritt ?? "2025-09-01",
      });
    }
  }
  console.log(`  ${byNeu} neue Kinder.`);

  console.log("Bayern: Vertretung für Sarah Lang + neue Fachkraft …");
  await ensureTeam(byKita.id, {
    einrichtung_id: byKita.id,
    gruppe_id: byKgId,
    vorname: "Katja",
    nachname: "Reuter",
    rolle: "Erzieherin",
    role_category: "fk",
    wochenstunden: 25,
    fachkraft: true,
    status: "aktiv",
    eintritt: "2026-08-01",
    // Vertretung für Sarah Lang (Mutterschutz/Elternzeit) — `team` hat kein Notizen-Feld, daher nur im
    // Skript-Kommentar dokumentiert statt in der Datenbank.
  } as TeamInsert & { vorname: string; nachname: string });
  await ensureTeam(byKita.id, {
    einrichtung_id: byKita.id,
    gruppe_id: byKgId,
    vorname: "Markus",
    nachname: "Lehner",
    rolle: "Erzieher",
    role_category: "fk",
    wochenstunden: 25,
    fachkraft: true,
    status: "aktiv",
    eintritt: "2025-09-01",
  } as TeamInsert & { vorname: string; nachname: string });

  // ==================== Baden-Württemberg: Regelgruppe (3 → 17), Ganztagsgruppe (4 → 17) ====================
  console.log("Baden-Württemberg: Regelgruppe und Ganztagsgruppe auffüllen …");
  const bwRegelId = gruppeId(bwKita.id, "Regelgruppe");
  const bwGanztagsId = gruppeId(bwKita.id, "Ganztagsgruppe");

  const bwRegel: NeuesKind[] = [
    { vorname: "Nele", nachname: "Werner", geburtsdatum: "2021-03-14", geschlecht: "weiblich", buchungszeitLabel: "25,5h-30h", wohnort: "Stuttgart" },
    { vorname: "Justus", nachname: "Huber", geburtsdatum: "2020-07-02", geschlecht: "maennlich", buchungszeitLabel: "30,5h-35h", wohnort: "Stuttgart" },
    { vorname: "Paula", nachname: "Meyer", geburtsdatum: "2021-10-20", geschlecht: "weiblich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Aaron", nachname: "Schwab", geburtsdatum: "2020-05-11", geschlecht: "maennlich", buchungszeitLabel: "20,5h-25h", wohnort: "Stuttgart" },
    { vorname: "Helena", nachname: "Dietrich", geburtsdatum: "2021-01-09", geschlecht: "weiblich", buchungszeitLabel: "40,5h-45h", wohnort: "Böblingen" },
    { vorname: "Vincent", nachname: "Krebs", geburtsdatum: "2020-09-27", geschlecht: "maennlich", buchungszeitLabel: "25,5h-30h", wohnort: "Stuttgart" },
    { vorname: "Josephine", nachname: "Pfeiffer", geburtsdatum: "2021-06-15", geschlecht: "weiblich", buchungszeitLabel: "30,5h-35h", wohnort: "Stuttgart" },
    { vorname: "Elian", nachname: "Seidel", geburtsdatum: "2020-11-08", geschlecht: "maennlich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Antonia", nachname: "Klose", geburtsdatum: "2021-04-23", geschlecht: "weiblich", buchungszeitLabel: "25,5h-30h", wohnort: "Esslingen" },
    { vorname: "Timo", nachname: "Kunz", geburtsdatum: "2020-08-19", geschlecht: "maennlich", buchungszeitLabel: "40,5h-45h", wohnort: "Stuttgart" },
    { vorname: "Rosalie", nachname: "Thiel", geburtsdatum: "2021-12-02", geschlecht: "weiblich", buchungszeitLabel: "30,5h-35h", wohnort: "Stuttgart" },
    { vorname: "Nick", nachname: "Wenzel", geburtsdatum: "2020-02-28", geschlecht: "maennlich", buchungszeitLabel: "20,5h-25h", wohnort: "Stuttgart" },
    { vorname: "Victoria", nachname: "Stark", geburtsdatum: "2021-07-07", geschlecht: "weiblich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Colin", nachname: "Berg", geburtsdatum: "2020-10-16", geschlecht: "maennlich", buchungszeitLabel: "25,5h-30h", wohnort: "Stuttgart" },
  ];
  const bwGanztags: NeuesKind[] = [
    { vorname: "Meike", nachname: "Franke", geburtsdatum: "2021-05-05", geschlecht: "weiblich", buchungszeitLabel: "45,5h-50h", wohnort: "Stuttgart" },
    { vorname: "Benedikt", nachname: "Kern", geburtsdatum: "2020-03-21", geschlecht: "maennlich", buchungszeitLabel: "40,5h-45h", wohnort: "Stuttgart" },
    { vorname: "Pia", nachname: "Fink", geburtsdatum: "2021-08-11", geschlecht: "weiblich", buchungszeitLabel: "45,5h-50h", wohnort: "Stuttgart" },
    { vorname: "Julius", nachname: "Vogler", geburtsdatum: "2020-06-30", geschlecht: "maennlich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Alina", nachname: "Baumann", geburtsdatum: "2021-02-26", geschlecht: "weiblich", buchungszeitLabel: "40,5h-45h", wohnort: "Böblingen" },
    { vorname: "Konstantin", nachname: "Roth", geburtsdatum: "2020-12-14", geschlecht: "maennlich", buchungszeitLabel: "45,5h-50h", wohnort: "Stuttgart" },
    { vorname: "Laura", nachname: "Adler", geburtsdatum: "2021-09-18", geschlecht: "weiblich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Erik", nachname: "Pape", geburtsdatum: "2020-04-04", geschlecht: "maennlich", buchungszeitLabel: "40,5h-45h", wohnort: "Stuttgart" },
    { vorname: "Carla", nachname: "Brandt", geburtsdatum: "2021-11-29", geschlecht: "weiblich", buchungszeitLabel: "45,5h-50h", wohnort: "Esslingen" },
    { vorname: "Tarik", nachname: "Lorenz", geburtsdatum: "2020-07-23", geschlecht: "maennlich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
    { vorname: "Hanna", nachname: "Berg", geburtsdatum: "2021-01-31", geschlecht: "weiblich", buchungszeitLabel: "40,5h-45h", wohnort: "Stuttgart" },
    { vorname: "Milo", nachname: "Kraus", geburtsdatum: "2020-09-09", geschlecht: "maennlich", buchungszeitLabel: "45,5h-50h", wohnort: "Stuttgart" },
    { vorname: "Talia", nachname: "Busch", geburtsdatum: "2021-03-27", geschlecht: "weiblich", buchungszeitLabel: "35,5h-40h", wohnort: "Stuttgart" },
  ];
  let bwNeu = 0;
  for (const [kinder, gruppe] of [[bwRegel, bwRegelId], [bwGanztags, bwGanztagsId]] as const) {
    for (const kind of kinder) {
      const { id, neu } = await ensureKind(bwKita.id, gruppe, kind, { buchungszeit_band_id: bandId("bw", kind.buchungszeitLabel) });
      if (neu) {
        bwNeu++;
        await supabase.from("kind_buchungszeit_historie").insert({
          kind_id: id,
          buchungszeit_band_id: bandId("bw", kind.buchungszeitLabel),
          gueltig_ab: kind.eintritt ?? "2025-09-01",
        });
      }
    }
  }
  console.log(`  ${bwNeu} neue Kinder.`);

  console.log("Baden-Württemberg: je eine neue Fachkraft für Regel- und Ganztagsgruppe …");
  await ensureTeam(bwKita.id, {
    einrichtung_id: bwKita.id,
    gruppe_id: bwRegelId,
    vorname: "Sabrina",
    nachname: "Hartmann",
    rolle: "Erzieherin",
    role_category: "fk",
    wochenstunden: 30,
    fachkraft: true,
    status: "aktiv",
    eintritt: "2025-09-01",
  } as TeamInsert & { vorname: string; nachname: string });
  await ensureTeam(bwKita.id, {
    einrichtung_id: bwKita.id,
    gruppe_id: bwGanztagsId,
    vorname: "Philipp",
    nachname: "Ott",
    rolle: "Erzieher",
    role_category: "fk",
    wochenstunden: 30,
    fachkraft: true,
    status: "aktiv",
    eintritt: "2025-09-01",
  } as TeamInsert & { vorname: string; nachname: string });

  // ==================== NRW: Gruppe I (2 → 17), Gruppe III (5 → 18) ====================
  console.log("NRW: Gruppe I und Gruppe III auffüllen …");
  const nrwGruppeIId = gruppeId(nrwKita.id, "Gruppe I");
  const nrwGruppeIIIId = gruppeId(nrwKita.id, "Gruppe III");

  const nrwGruppeI: NeuesKind[] = [
    { vorname: "Elena", nachname: "Roth", geburtsdatum: "2020-04-18", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Niklas", nachname: "Werner", geburtsdatum: "2021-02-09", geschlecht: "maennlich", buchungszeitLabel: "25h" },
    { vorname: "Isabel", nachname: "Huber", geburtsdatum: "2020-10-03", geschlecht: "weiblich", buchungszeitLabel: "45h" },
    { vorname: "Simon", nachname: "Meyer", geburtsdatum: "2021-06-27", geschlecht: "maennlich", buchungszeitLabel: "35h" },
    { vorname: "Fiona", nachname: "Schwab", geburtsdatum: "2020-01-14", geschlecht: "weiblich", buchungszeitLabel: "25h" },
    { vorname: "Rafael", nachname: "Dietrich", geburtsdatum: "2021-09-22", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Melina", nachname: "Krebs", geburtsdatum: "2020-05-30", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Jannik", nachname: "Pfeiffer", geburtsdatum: "2021-12-11", geschlecht: "maennlich", buchungszeitLabel: "25h" },
    { vorname: "Sina", nachname: "Seidel", geburtsdatum: "2020-08-08", geschlecht: "weiblich", buchungszeitLabel: "45h" },
    { vorname: "Oskar", nachname: "Klose", geburtsdatum: "2021-03-05", geschlecht: "maennlich", buchungszeitLabel: "35h" },
    { vorname: "Yasmin", nachname: "Kunz", geburtsdatum: "2020-11-19", geschlecht: "weiblich", buchungszeitLabel: "25h" },
    { vorname: "Linus", nachname: "Thiel", geburtsdatum: "2021-07-16", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Elisa", nachname: "Wenzel", geburtsdatum: "2020-02-24", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Fabian", nachname: "Stark", geburtsdatum: "2021-10-30", geschlecht: "maennlich", buchungszeitLabel: "25h" },
    { vorname: "Nora", nachname: "Berg", geburtsdatum: "2020-06-12", geschlecht: "weiblich", buchungszeitLabel: "45h" },
  ];
  const nrwGruppeIII: NeuesKind[] = [
    { vorname: "Matteo", nachname: "Franke", geburtsdatum: "2020-09-01", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Luisa", nachname: "Kern", geburtsdatum: "2021-01-17", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Emil", nachname: "Fink", geburtsdatum: "2020-12-25", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Wanda", nachname: "Vogler", geburtsdatum: "2021-05-08", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Jannis", nachname: "Baumann", geburtsdatum: "2020-03-14", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Klara", nachname: "Roth", geburtsdatum: "2021-08-21", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Bruno", nachname: "Pape", geburtsdatum: "2020-07-09", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Ronja", nachname: "Brandt", geburtsdatum: "2021-04-02", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Kilian", nachname: "Lorenz", geburtsdatum: "2020-10-28", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Mathilda", nachname: "Berg", geburtsdatum: "2021-11-06", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Cornelius", nachname: "Kraus", geburtsdatum: "2020-05-19", geschlecht: "maennlich", buchungszeitLabel: "45h" },
    { vorname: "Marla", nachname: "Busch", geburtsdatum: "2021-09-14", geschlecht: "weiblich", buchungszeitLabel: "35h" },
    { vorname: "Bastian", nachname: "Adler", geburtsdatum: "2020-08-02", geschlecht: "maennlich", buchungszeitLabel: "45h" },
  ];
  let nrwNeu = 0;
  for (const [kinder, gruppe] of [[nrwGruppeI, nrwGruppeIId], [nrwGruppeIII, nrwGruppeIIIId]] as const) {
    for (const kind of kinder) {
      const { id, neu } = await ensureKind(nrwKita.id, gruppe, kind, { buchungszeit_band_id: bandId("nrw", kind.buchungszeitLabel) });
      if (neu) {
        nrwNeu++;
        await supabase.from("kind_buchungszeit_historie").insert({
          kind_id: id,
          buchungszeit_band_id: bandId("nrw", kind.buchungszeitLabel),
          gueltig_ab: kind.eintritt ?? "2025-09-01",
        });
      }
    }
  }
  console.log(`  ${nrwNeu} neue Kinder.`);

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
