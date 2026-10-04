/**
 * Milestone 32, Phase D: je Bundesland eine zweite Demo-Einrichtung mit vollständigen Daten, damit die Demo je
 * Bundesland zwei Einrichtungen zeigt (Übersicht, Schnellwechsler, Cluster-Funktionen):
 *   - Bayern:             "Kita Sonnenschein" (Augsburg)   — Cluster "Bayern 1"
 *   - Baden-Württemberg:  "Kita Regenbogen"   (Karlsruhe)  — Cluster "BaWü 1"
 *   - Nordrhein-Westfalen:"Kita Löwenzahn"    (Düsseldorf) — Cluster "NRW 1"
 *
 * Je Einrichtung: Gruppen (bundeslandspezifische Felder), Kinder bis zur vollen Sollplatz-Belegung plus einige
 * Nachrücker, Personal mit Vergütung (TVöD-Einstufung, einmal manuelles Gehalt), Kostenstelle/Cluster, Lohnnebenkosten.
 * Wichtig (kein Trigger!): jedes Kind braucht eine Zeile in kind_buchungszeit_historie, sonst landet es in der
 * Belegung unter "Ohne Buchungszeit"; aktive Kinder und Nachrücker brauchen ein Austrittsdatum.
 *
 * Angelegt wird nur im Quell-Träger "Villa Kunterbunt". Die Demo ("Bellegio Demo") entsteht danach per
 * scripts/demo-einrichten.ts (kopiert inzwischen auch Vergütung und Finanzfelder).
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone32-zweite-kitas.ts
 * Idempotent: Einrichtung/Gruppe/Kind/Person werden nur angelegt, wenn es sie (per Name) noch nicht gibt. Die Namen
 * sind deterministisch, ein zweiter Lauf legt nichts doppelt an.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString, vorgeschlagenerAustritt } from "../lib/kita-datum";

type Bundesland = "by" | "bw" | "nrw";
type Alter = "u3" | "ue3" | "gemischt";

type GruppeSpec = {
  name: string;
  gruppenart: "krippe" | "kindergarten" | "altersgemischt";
  sollplatze: number;
  alter: Alter;
  nachruecker: number;
  baender: string[];
  bw?: { betriebsform: string; oeffnung: number };
  nrw?: { form: "I" | "II" | "III"; stunden: number };
};

type PersonSpec = {
  vorname: string;
  nachname: string;
  rolle: string;
  kategorie: "fk" | "ek";
  stunden: number;
  gruppe: number | null;
  eintritt: string;
  eg: "S8a" | "S4";
  stufe?: number;
  manuell?: number;
};

type EinrichtungSpec = {
  name: string;
  ort: string;
  plz: string;
  strasse: string;
  bundesland: Bundesland;
  kostenstelle: string;
  cluster: string;
  foerderManuell: number | null;
  gruppen: GruppeSpec[];
  team: PersonSpec[];
};

const SPECS: EinrichtungSpec[] = [
  {
    name: "Kita Sonnenschein",
    ort: "Augsburg",
    plz: "86150",
    strasse: "Sonnenweg 12",
    bundesland: "by",
    kostenstelle: "KST-BY-02",
    cluster: "Bayern 1",
    foerderManuell: null,
    gruppen: [
      { name: "Krippe Sternchen", gruppenart: "krippe", sollplatze: 12, alter: "u3", nachruecker: 1, baender: ["6-7h", "7-8h", "8-9h", "5-6h"] },
      { name: "Kindergarten Wirbelwind", gruppenart: "kindergarten", sollplatze: 25, alter: "ue3", nachruecker: 2, baender: ["4-5h", "5-6h", "6-7h", "7-8h", "8-9h"] },
    ],
    team: [
      { vorname: "Katharina", nachname: "Meier", rolle: "Erzieherin", kategorie: "fk", stunden: 39, gruppe: 1, eintritt: "2016-09-01", eg: "S8a", stufe: 6 },
      { vorname: "Stefan", nachname: "Huber", rolle: "Erzieher", kategorie: "fk", stunden: 39, gruppe: 1, eintritt: "2019-09-01", eg: "S8a", stufe: 4 },
      { vorname: "Julia", nachname: "Wagner", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 39, gruppe: 0, eintritt: "2021-09-01", eg: "S8a", stufe: 3 },
      { vorname: "Melanie", nachname: "Schuster", rolle: "Erzieherin", kategorie: "fk", stunden: 30, gruppe: 0, eintritt: "2018-09-01", eg: "S8a", stufe: 5 },
      { vorname: "Nicole", nachname: "Brandl", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 25, gruppe: 1, eintritt: "2023-09-01", eg: "S8a", stufe: 2 },
      { vorname: "Sabine", nachname: "Fischer", rolle: "Kinderpflegerin", kategorie: "ek", stunden: 30, gruppe: 0, eintritt: "2017-09-01", eg: "S4", stufe: 5 },
      { vorname: "Tobias", nachname: "Eder", rolle: "Ergänzungskraft", kategorie: "ek", stunden: 20, gruppe: 1, eintritt: "2024-09-01", eg: "S4", manuell: 2650 },
    ],
  },
  {
    name: "Kita Regenbogen",
    ort: "Karlsruhe",
    plz: "76133",
    strasse: "Regenbogenstraße 5",
    bundesland: "bw",
    kostenstelle: "KST-BW-02",
    cluster: "BaWü 1",
    foerderManuell: 48500,
    gruppen: [
      {
        name: "Marienkäfer", gruppenart: "kindergarten", sollplatze: 22, alter: "ue3", nachruecker: 1,
        baender: ["25,5h-30h", "30,5h-35h", "35,5h-40h"], bw: { betriebsform: "verlaengerte_oeffnungszeit", oeffnung: 6 },
      },
      {
        name: "Schmetterlinge", gruppenart: "kindergarten", sollplatze: 20, alter: "ue3", nachruecker: 1,
        baender: ["35,5h-40h", "40,5h-45h", "45,5h-50h"], bw: { betriebsform: "ganztagsgruppe", oeffnung: 7 },
      },
      {
        name: "Hummeln", gruppenart: "krippe", sollplatze: 10, alter: "u3", nachruecker: 1,
        baender: ["35,5h-40h", "40,5h-45h"], bw: { betriebsform: "kinderkrippe", oeffnung: 7 },
      },
    ],
    team: [
      { vorname: "Sandra", nachname: "Becker", rolle: "Erzieherin", kategorie: "fk", stunden: 39, gruppe: 0, eintritt: "2015-09-01", eg: "S8a", stufe: 5 },
      { vorname: "Markus", nachname: "Hofmann", rolle: "Erzieher", kategorie: "fk", stunden: 39, gruppe: 1, eintritt: "2013-09-01", eg: "S8a", stufe: 6 },
      { vorname: "Anja", nachname: "Krämer", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 39, gruppe: 2, eintritt: "2020-09-01", eg: "S8a", stufe: 3 },
      { vorname: "Daniel", nachname: "Lorenz", rolle: "Erzieher", kategorie: "fk", stunden: 39, gruppe: 1, eintritt: "2022-09-01", eg: "S8a", stufe: 2 },
      { vorname: "Petra", nachname: "Zimmermann", rolle: "Erzieherin", kategorie: "fk", stunden: 30, gruppe: 0, eintritt: "2017-09-01", eg: "S8a", stufe: 4 },
      { vorname: "Laura", nachname: "Kessler", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 30, gruppe: 2, eintritt: "2021-09-01", eg: "S8a", stufe: 3 },
      { vorname: "Heike", nachname: "Albrecht", rolle: "Ergänzungskraft", kategorie: "ek", stunden: 25, gruppe: 0, eintritt: "2019-09-01", eg: "S4", stufe: 4 },
      { vorname: "Monika", nachname: "Vogel", rolle: "Ergänzungskraft", kategorie: "ek", stunden: 25, gruppe: 1, eintritt: "2023-09-01", eg: "S4", stufe: 3 },
    ],
  },
  {
    name: "Kita Löwenzahn",
    ort: "Düsseldorf",
    plz: "40213",
    strasse: "Löwenzahnallee 3",
    bundesland: "nrw",
    kostenstelle: "KST-NRW-02",
    cluster: "NRW 1",
    foerderManuell: null,
    gruppen: [
      { name: "Sonnengruppe", gruppenart: "altersgemischt", sollplatze: 20, alter: "gemischt", nachruecker: 1, baender: ["35h", "35h", "45h", "25h"], nrw: { form: "I", stunden: 35 } },
      { name: "Mondgruppe", gruppenart: "krippe", sollplatze: 10, alter: "u3", nachruecker: 1, baender: ["25h", "25h", "35h"], nrw: { form: "II", stunden: 25 } },
      { name: "Sterngruppe", gruppenart: "kindergarten", sollplatze: 20, alter: "ue3", nachruecker: 1, baender: ["45h", "45h", "35h"], nrw: { form: "III", stunden: 45 } },
    ],
    team: [
      { vorname: "Birgit", nachname: "Hoffmann", rolle: "Erzieherin", kategorie: "fk", stunden: 39, gruppe: 0, eintritt: "2014-09-01", eg: "S8a", stufe: 6 },
      { vorname: "Christian", nachname: "Schäfer", rolle: "Erzieher", kategorie: "fk", stunden: 39, gruppe: 2, eintritt: "2018-09-01", eg: "S8a", stufe: 5 },
      { vorname: "Verena", nachname: "Koch", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 39, gruppe: 1, eintritt: "2021-09-01", eg: "S8a", stufe: 3 },
      { vorname: "Ralf", nachname: "Meyer", rolle: "Erzieher", kategorie: "fk", stunden: 35, gruppe: 0, eintritt: "2016-09-01", eg: "S8a", stufe: 4 },
      { vorname: "Tanja", nachname: "Schmitz", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 30, gruppe: 2, eintritt: "2023-09-01", eg: "S8a", stufe: 2 },
      { vorname: "Silke", nachname: "Lang", rolle: "Erzieherin", kategorie: "fk", stunden: 30, gruppe: 1, eintritt: "2019-09-01", eg: "S8a", stufe: 4 },
      { vorname: "Eva", nachname: "Bauer", rolle: "Pädagogische Fachkraft", kategorie: "fk", stunden: 25, gruppe: 0, eintritt: "2024-09-01", eg: "S8a", manuell: 3350 },
      { vorname: "Jasmin", nachname: "Krause", rolle: "Ergänzungskraft", kategorie: "ek", stunden: 30, gruppe: 2, eintritt: "2020-09-01", eg: "S4", stufe: 3 },
      { vorname: "Dieter", nachname: "Winter", rolle: "Ergänzungskraft", kategorie: "ek", stunden: 25, gruppe: 2, eintritt: "2017-09-01", eg: "S4", stufe: 5 },
    ],
  },
];

const VORNAMEN_M = ["Leon", "Noah", "Elias", "Finn", "Ben", "Paul", "Luca", "Jonas", "Felix", "Emil", "Theo", "Anton", "Henry", "Oskar", "Jakob", "Samuel", "David", "Moritz", "Tim", "Mats", "Levi", "Niklas", "Fabian", "Julian", "Philipp", "Linus", "Carl", "Ole", "Arne", "Jannik"];
const VORNAMEN_W = ["Mia", "Emma", "Hannah", "Lina", "Sophia", "Lea", "Emilia", "Marie", "Anna", "Clara", "Mila", "Ida", "Johanna", "Frieda", "Greta", "Lotta", "Charlotte", "Amelie", "Leni", "Nele", "Paula", "Ella", "Maja", "Pia", "Zoe", "Elisa", "Jule", "Merle", "Romy", "Svea"];
const NACHNAMEN = [
  "Albers", "Baumgart", "Conrad", "Dietrich", "Engelhardt", "Frank", "Gruber", "Haas", "Immel", "Jansen", "Kaiser", "Lindner", "Martens",
  "Naumann", "Ostermann", "Pfeiffer", "Quast", "Reinhardt", "Sander", "Thiel", "Ulrich", "Voigt", "Weidner", "Zeller", "Arndt", "Bender",
  "Cramer", "Dorn", "Ebert", "Fiedler", "Gerlach", "Heinz", "Ihle", "Jäger", "Köhler", "Lenz", "Mertens", "Neubauer", "Opitz", "Peters",
  "Rauch", "Sommer", "Trapp", "Unger", "Vetter", "Wolter", "Ziegler", "Auer", "Bachmann", "Dreher", "Eckert", "Fink", "Graf", "Herold",
  "Kuhn", "Lorenz", "Maier", "Nagel", "Pohl", "Roth",
];

/** Kleiner deterministischer Zufallsgenerator (mulberry32), damit jeder Lauf dieselben Daten erzeugt. */
function zufall(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tagZwischen(rnd: () => number, von: string, bis: string): string {
  const a = parseIsoDate(von).getTime();
  const b = parseIsoDate(bis).getTime();
  return toIsoDateString(new Date(a + Math.floor(rnd() * (b - a))));
}

function ersterDesMonats(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function spaeter(a: string, b: string): string {
  return a > b ? a : b;
}

function frueher(a: string, b: string): string {
  return a < b ? a : b;
}

const GEBURTSFENSTER: Record<Alter, [string, string]> = {
  u3: ["2024-03-01", "2025-08-31"],
  ue3: ["2020-10-01", "2023-06-30"],
  gemischt: ["2021-06-01", "2025-03-31"],
};
const NACHRUECKER_GEBURTSFENSTER: Record<Alter, [string, string]> = {
  u3: ["2025-06-01", "2026-02-28"],
  ue3: ["2022-10-01", "2023-11-30"],
  gemischt: ["2022-10-01", "2025-06-30"],
};
const MIN_EINTRITTSALTER_MONATE: Record<Alter, number> = { u3: 12, ue3: 30, gemischt: 18 };

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local).");
    process.exit(1);
  }
  const sb = createClient<Database>(supabaseUrl, serviceRoleKey);
  const heute = new Date();
  const heuteIso = toIsoDateString(heute);

  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!traeger) throw new Error('Träger "Villa Kunterbunt" nicht gefunden.');

  const { data: faktorZeilen } = await sb.from("weighting_factors").select("id, code").eq("bundesland_code", "by");
  const faktorId = new Map((faktorZeilen ?? []).map((f) => [f.code, f.id]));

  for (const [specIndex, spec] of SPECS.entries()) {
    const rnd = zufall(32000 + specIndex);
    console.log(`\n== ${spec.name} (${spec.bundesland}) ==`);

    const { data: baender } = await sb.from("booking_time_bands").select("id, label").eq("bundesland_code", spec.bundesland);
    const bandId = new Map((baender ?? []).map((b) => [b.label, b.id]));

    // Einrichtung
    let { data: einrichtung } = await sb.from("einrichtungen").select("id").eq("trager_id", traeger.id).eq("name", spec.name).maybeSingle();
    if (!einrichtung) {
      const { data: neu, error } = await sb
        .from("einrichtungen")
        .insert({
          trager_id: traeger.id,
          name: spec.name,
          address_street: spec.strasse,
          address_zip: spec.plz,
          address_city: spec.ort,
          kita_year_start_month: 9,
          vollzeit_wochenstunden: 39,
          bundesland_code: spec.bundesland,
          empfohlener_anstellungsschluessel: 10,
          standort_gemeinde: spec.bundesland === "bw" ? spec.ort : null,
          auswaertigen_quote_prozent: spec.bundesland === "bw" ? 10 : null,
          kostenstelle: spec.kostenstelle,
          cluster: spec.cluster,
          foerderung_monatlich_manuell: spec.foerderManuell,
          lohnnebenkosten_prozent: 28,
          jahressonderzahlung_prozent: 85,
        })
        .select("id")
        .single();
      if (error || !neu) throw new Error(error?.message ?? "Einrichtung nicht angelegt.");
      einrichtung = neu;
      console.log("Einrichtung angelegt.");
    }
    const einrichtungId = einrichtung.id;

    // Gruppen
    const gruppeIds: string[] = [];
    for (const [i, g] of spec.gruppen.entries()) {
      let { data: gruppe } = await sb.from("gruppen").select("id").eq("einrichtung_id", einrichtungId).eq("name", g.name).maybeSingle();
      if (!gruppe) {
        const { data: neu, error } = await sb
          .from("gruppen")
          .insert({
            einrichtung_id: einrichtungId,
            name: g.name,
            gruppenart: g.gruppenart,
            sollplatze: g.sollplatze,
            sort_order: i,
            bw_betriebsform: g.bw?.betriebsform ?? null,
            bw_altersmischung: false,
            bw_oeffnungszeit_stunden: g.bw?.oeffnung ?? null,
            nrw_gruppenform: g.nrw?.form ?? null,
            nrw_buchungszeit_stunden: g.nrw?.stunden ?? null,
          })
          .select("id")
          .single();
        if (error || !neu) throw new Error(error?.message ?? "Gruppe nicht angelegt.");
        gruppe = neu;
      }
      gruppeIds.push(gruppe.id);
    }

    // Kinder
    const { data: vorhandene } = await sb.from("kinder").select("vorname, nachname").eq("einrichtung_id", einrichtungId);
    const vergeben = new Set((vorhandene ?? []).map((k) => `${k.vorname} ${k.nachname}`));
    let namenszaehler = specIndex * 7;
    const naechsterName = (geschlecht: "maennlich" | "weiblich") => {
      for (;;) {
        namenszaehler += 1;
        const liste = geschlecht === "maennlich" ? VORNAMEN_M : VORNAMEN_W;
        const vorname = liste[(namenszaehler * 3) % liste.length];
        const nachname = NACHNAMEN[(namenszaehler * 7 + specIndex * 5) % NACHNAMEN.length];
        return { vorname, nachname, schluessel: `${vorname} ${nachname}` };
      }
    };

    type Neu = { kind: Database["public"]["Tables"]["kinder"]["Insert"]; faktoren: string[]; band: string | null; eintritt: string };
    const neueKinder: Neu[] = [];
    let ersterKgKindMarkiert = false;
    let integrationVergeben = false;
    let sonderfaelle = 0;

    for (const [i, g] of spec.gruppen.entries()) {
      const gesamt = g.sollplatze + g.nachruecker;
      for (let n = 0; n < gesamt; n++) {
        const istNachruecker = n >= g.sollplatze;
        const geschlecht: "maennlich" | "weiblich" = (n + i) % 2 === 0 ? "weiblich" : "maennlich";
        let name = naechsterName(geschlecht);
        while (vergeben.has(name.schluessel)) name = naechsterName(geschlecht);
        vergeben.add(name.schluessel);

        const [gebVon, gebBis] = istNachruecker ? NACHRUECKER_GEBURTSFENSTER[g.alter] : GEBURTSFENSTER[g.alter];
        const geburtsdatum = tagZwischen(rnd, gebVon, gebBis);
        const fruehesterEintritt = ersterDesMonats(toIsoDateString(addMonthsUtc(parseIsoDate(geburtsdatum), MIN_EINTRITTSALTER_MONATE[g.alter])));
        let eintritt: string;
        if (istNachruecker) {
          eintritt = tagZwischen(rnd, "2026-11-01", "2027-03-01");
          eintritt = ersterDesMonats(eintritt);
        } else {
          eintritt = ersterDesMonats(
            frueher(spaeter(fruehesterEintritt, g.alter === "u3" ? "2025-01-01" : "2024-09-01"), "2026-09-01")
          );
        }
        let austritt = vorgeschlagenerAustritt(geburtsdatum, g.gruppenart === "krippe", heute);
        // Ein Kind verlässt die Einrichtung bald (zeigt "Austritte" in den Aufgaben und "Plätze werden frei")
        if (!istNachruecker && g.gruppenart !== "krippe" && !ersterKgKindMarkiert) {
          austritt = "2026-12-31";
          ersterKgKindMarkiert = true;
        }
        const band = g.baender[Math.floor(rnd() * g.baender.length)];
        const faktoren: string[] = [];
        let hatBehinderung = false;
        if (spec.bundesland === "by") {
          faktoren.push(g.gruppenart === "krippe" ? "u3" : "ue3_bis_schuleintritt");
          if (!istNachruecker && g.gruppenart !== "krippe" && n === 6) faktoren.push("nicht_deutschsprachig");
          if (!istNachruecker && g.gruppenart !== "krippe" && n === 14) faktoren.push("nicht_deutschsprachig");
          if (!istNachruecker && g.gruppenart !== "krippe" && n === 9 && !integrationVergeben) {
            faktoren.push("integrationskinder");
            hatBehinderung = true;
            integrationVergeben = true;
          }
        } else if (!istNachruecker && n === 4 && sonderfaelle < 1) {
          hatBehinderung = true;
          sonderfaelle += 1;
        }
        const wohnort = spec.bundesland === "bw" ? (rnd() < 0.08 ? "Ettlingen" : spec.ort) : null;

        neueKinder.push({
          faktoren,
          band,
          eintritt,
          kind: {
            einrichtung_id: einrichtungId,
            gruppe_id: gruppeIds[i],
            vorname: name.vorname,
            nachname: name.nachname,
            geburtsdatum,
            geschlecht,
            status: istNachruecker ? "nachruecker" : "aktiv",
            eintritt,
            austritt,
            buchungszeit_band_id: band ? (bandId.get(band) ?? null) : null,
            hat_behinderung: hatBehinderung,
            wohnort,
          },
        });
      }
    }

    // Nur anlegen, was es noch nicht gibt (Namen sind deterministisch, siehe oben)
    const anzulegen = neueKinder.filter((k) => !(vorhandene ?? []).some((v) => v.vorname === k.kind.vorname && v.nachname === k.kind.nachname));
    if (anzulegen.length > 0) {
      const { data: eingefuegt, error } = await sb.from("kinder").insert(anzulegen.map((k) => k.kind)).select("id, vorname, nachname");
      if (error) throw new Error(`Kinder: ${error.message}`);
      const idByName = new Map((eingefuegt ?? []).map((k) => [`${k.vorname} ${k.nachname}`, k.id]));

      const faktorInsert: { kind_id: string; weighting_factor_id: string }[] = [];
      const historieInsert: { kind_id: string; buchungszeit_band_id: string | null; gueltig_ab: string }[] = [];
      for (const k of anzulegen) {
        const id = idByName.get(`${k.kind.vorname} ${k.kind.nachname}`);
        if (!id) continue;
        for (const code of k.faktoren) {
          const fid = faktorId.get(code);
          if (fid) faktorInsert.push({ kind_id: id, weighting_factor_id: fid });
        }
        historieInsert.push({ kind_id: id, buchungszeit_band_id: k.kind.buchungszeit_band_id ?? null, gueltig_ab: k.eintritt });
      }
      if (faktorInsert.length > 0) {
        const { error: fe } = await sb.from("kind_weighting_factors").insert(faktorInsert);
        if (fe) throw new Error(`Gewichtungen: ${fe.message}`);
      }
      const { error: he } = await sb.from("kind_buchungszeit_historie").insert(historieInsert);
      if (he) throw new Error(`Buchungszeit-Historie: ${he.message}`);
    }
    console.log(`Kinder: ${anzulegen.length} neu (${neueKinder.length} geplant).`);

    // Personal samt Vergütung
    let personNeu = 0;
    for (const p of spec.team) {
      let { data: person } = await sb.from("team").select("id").eq("einrichtung_id", einrichtungId).eq("vorname", p.vorname).eq("nachname", p.nachname).maybeSingle();
      if (!person) {
        const { data: neu, error } = await sb
          .from("team")
          .insert({
            einrichtung_id: einrichtungId,
            gruppe_id: p.gruppe !== null ? gruppeIds[p.gruppe] : null,
            vorname: p.vorname,
            nachname: p.nachname,
            rolle: p.rolle,
            wochenstunden: p.stunden,
            fachkraft: p.kategorie === "fk",
            status: "aktiv",
            eintritt: p.eintritt,
            role_category: p.kategorie,
          })
          .select("id")
          .single();
        if (error || !neu) throw new Error(`Team ${p.vorname} ${p.nachname}: ${error?.message}`);
        person = neu;
        personNeu += 1;
      }
      const { error: ve } = await sb.from("team_verguetung").upsert(
        {
          team_id: person.id,
          einrichtung_id: einrichtungId,
          entgeltgruppe: p.manuell ? null : p.eg,
          stufe: p.manuell ? null : (p.stufe ?? null),
          monatsgehalt_manuell: p.manuell ?? null,
        },
        { onConflict: "team_id" }
      );
      if (ve) throw new Error(`Vergütung ${p.vorname} ${p.nachname}: ${ve.message}`);
    }
    console.log(`Personal: ${personNeu} neu (${spec.team.length} geplant).`);

    // Mitarbeitende, die in der gleichen Bundesland-Schwestereinrichtung Rechte haben, bekommen sie hier ebenfalls
    const { data: schwestern } = await sb
      .from("einrichtungen")
      .select("id")
      .eq("trager_id", traeger.id)
      .eq("bundesland_code", spec.bundesland)
      .neq("id", einrichtungId)
      .is("archived_at", null);
    const schwesterIds = (schwestern ?? []).map((s) => s.id);
    if (schwesterIds.length > 0) {
      const { data: rechte } = await sb.from("einrichtung_berechtigungen").select("user_id, bereich, zugriff").in("einrichtung_id", schwesterIds);
      const eindeutig = new Map((rechte ?? []).map((r) => [`${r.user_id}|${r.bereich}`, r]));
      const zeilen = [...eindeutig.values()].map((r) => ({ user_id: r.user_id, einrichtung_id: einrichtungId, bereich: r.bereich, zugriff: r.zugriff }));
      if (zeilen.length > 0) {
        const { error } = await sb.from("einrichtung_berechtigungen").upsert(zeilen, { onConflict: "user_id,einrichtung_id,bereich" });
        if (error) throw new Error(`Berechtigungen: ${error.message}`);
      }
      console.log(`Berechtigungen übernommen: ${zeilen.length}.`);
    }
  }

  // Die BW-Demo ohne Förderbetrag zeigte -53.728 € Ergebnis (BW hat keine Landesformel, der Betrag ist manuell zu pflegen).
  const { data: altesBw } = await sb
    .from("einrichtungen")
    .select("id, foerderung_monatlich_manuell")
    .eq("trager_id", traeger.id)
    .eq("name", "Testkita Baden-Württemberg")
    .maybeSingle();
  if (altesBw && altesBw.foerderung_monatlich_manuell === null) {
    await sb.from("einrichtungen").update({ foerderung_monatlich_manuell: 55000 }).eq("id", altesBw.id);
    console.log("Testkita Baden-Württemberg: Demo-Förderbetrag 55.000 €/Monat gesetzt.");
  }

  console.log(`\nFertig (${heuteIso}). Demo ableiten: npx tsx --env-file=.env.local scripts/demo-einrichten.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
