/**
 * Milestone 33: realistischere Demo-Daten im Quell-Träger "Villa Kunterbunt" (die Demo entsteht danach per
 * scripts/demo-einrichten.ts).
 *
 *  1. Altersmischung: In Kindergartengruppen, in denen fast alle Kinder gleich alt sind (und im September 2027 gemeinsam
 *     eingeschult werden), verteilen sich die Geburtsdaten über drei Jahrgänge — jedes Jahr geht rund ein Drittel.
 *  2. Interne Wechsel: etwa die Hälfte der Krippenkinder, die bis September 2027 drei werden, wechselt geplant in den
 *     Kindergarten (Gruppenhistorie ab 01.09.2027); die übrigen bleiben als Vorschläge ("Wechsel planen") offen.
 *  3. Neue Kinder zum Kitajahr 2027/28: Status "geplant", Eintritt 01.09.2027, so viele, dass je Gruppe 1–2 Plätze frei bleiben.
 *  4. Personal: Testkita Baden-Württemberg hatte 135 % des Bedarfs — auf realistische ~112 % gesetzt.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone33-demo-realistisch.ts
 * Idempotent über einen Marker: Hat eine Einrichtung schon "geplant"-Kinder mit Eintritt 01.09.2027, wird sie übersprungen.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString, vorgeschlagenerAustritt } from "../lib/kita-datum";

const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const HEUTE = new Date();
const HEUTE_ISO = toIsoDateString(HEUTE);
const SEPT27 = "2027-09-01";
const SEPT28 = "2028-09-01";

const VORNAMEN_M = ["Leon", "Noah", "Elias", "Finn", "Ben", "Paul", "Luca", "Jonas", "Felix", "Emil", "Theo", "Anton", "Henry", "Oskar", "Jakob", "Samuel", "David", "Moritz", "Tim", "Mats"];
const VORNAMEN_W = ["Mia", "Emma", "Hannah", "Lina", "Sophia", "Lea", "Emilia", "Marie", "Anna", "Clara", "Mila", "Ida", "Johanna", "Frieda", "Greta", "Lotta", "Charlotte", "Amelie", "Leni", "Nele"];
const NACHNAMEN = ["Falk", "Gebauer", "Hoffmann", "Ismail", "Jost", "Keller", "Lehmann", "Maurer", "Noack", "Oertel", "Pape", "Riedel", "Seidel", "Tietz", "Uhlig", "Vogel", "Wendt", "Yildiz", "Zimmer", "Brandt", "Czerny", "Derksen", "Engel", "Funke", "Gross", "Hahn", "Illner", "Jung", "Kraft", "Lang"];

function ersterDesMonats(d: Date): string {
  return toIsoDateString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

async function bearbeiteEinrichtung(e: { id: string; name: string }, namenZaehler: { n: number }) {
  const { data: gruppen } = await sb
    .from("gruppen")
    .select("id, name, gruppenart, sollplatze")
    .eq("einrichtung_id", e.id)
    .is("archived_at", null)
    .order("sort_order");
  const { data: marker } = await sb.from("kinder").select("id").eq("einrichtung_id", e.id).eq("status", "geplant").eq("eintritt", SEPT27).limit(1);
  const schonBearbeitet = (marker ?? []).length > 0;
  const { data: alleKinder } = await sb
    .from("kinder")
    .select("id, gruppe_id, geburtsdatum, eintritt, austritt, status, buchungszeit_band_id, vorname, nachname")
    .eq("einrichtung_id", e.id)
    .is("archived_at", null)
    .order("id");
  const kinder = alleKinder ?? [];
  const vergebeneNamen = new Set(kinder.map((k) => `${k.vorname} ${k.nachname}`));

  // 1. Altersmischung in Kindergartengruppen
  for (const g of schonBearbeitet ? [] : (gruppen ?? []).filter((x) => x.gruppenart !== "krippe")) {
    const aktiv = kinder.filter((k) => k.gruppe_id === g.id && k.status === "aktiv");
    const gehen = aktiv.filter((k) => k.austritt && k.austritt <= SEPT27).length;
    if (aktiv.length === 0 || gehen / aktiv.length <= 0.5) continue;
    const minMonate = g.gruppenart === "altersgemischt" ? 30 : 36;
    const maxMonate = 71;
    const n = aktiv.length;
    for (let i = 0; i < n; i++) {
      const kind = aktiv[i];
      const rang = (i * 7) % n;
      const monate = minMonate + Math.floor(((rang + 0.5) * (maxMonate - minMonate)) / n);
      const geb = addMonthsUtc(HEUTE, -monate);
      geb.setUTCDate(((i * 11) % 27) + 1);
      const geburtsdatum = toIsoDateString(geb);
      const dritter = addMonthsUtc(parseIsoDate(geburtsdatum), minMonate);
      const eintritt = ersterDesMonats(dritter) > HEUTE_ISO ? ersterDesMonats(HEUTE) : ersterDesMonats(dritter);
      const austritt = vorgeschlagenerAustritt(geburtsdatum, false, HEUTE);
      const { error } = await sb.from("kinder").update({ geburtsdatum, eintritt, austritt }).eq("id", kind.id);
      if (error) throw new Error(error.message);
      kind.geburtsdatum = geburtsdatum;
      kind.eintritt = eintritt;
      kind.austritt = austritt;
      await sb.from("kind_buchungszeit_historie").update({ gueltig_ab: eintritt }).eq("kind_id", kind.id);
      await sb.from("kind_gruppen_historie").update({ gueltig_ab: eintritt }).eq("kind_id", kind.id);
    }
    console.log(`${e.name} / ${g.name}: Altersmischung für ${n} Kinder neu verteilt.`);
  }

  // 2. Interne Wechsel Krippe → Kindergarten (die Hälfte der Kandidaten)
  const ziel = [...(gruppen ?? [])].filter((g) => g.gruppenart !== "krippe").sort((a, b) => Number(b.sollplatze) - Number(a.sollplatze))[0];
  const wechselInZiel: string[] = [];
  if (ziel && !schonBearbeitet) {
    for (const krippe of (gruppen ?? []).filter((g) => g.gruppenart === "krippe")) {
      const kandidaten = kinder
        .filter((k) => k.gruppe_id === krippe.id && k.status === "aktiv" && k.austritt && k.austritt <= SEPT27)
        .sort((a, b) => a.geburtsdatum.localeCompare(b.geburtsdatum));
      const anzahl = Math.ceil(kandidaten.length / 2);
      for (const kind of kandidaten.slice(0, anzahl)) {
        const austritt = vorgeschlagenerAustritt(kind.geburtsdatum, false, HEUTE);
        const { error } = await sb.from("kinder").update({ austritt }).eq("id", kind.id);
        if (error) throw new Error(error.message);
        const { error: he } = await sb.from("kind_gruppen_historie").insert({ kind_id: kind.id, gruppe_id: ziel.id, gueltig_ab: SEPT27 });
        if (he) throw new Error(he.message);
        kind.austritt = austritt;
        wechselInZiel.push(kind.id);
      }
      console.log(`${e.name} / ${krippe.name}: ${anzahl} von ${kandidaten.length} Wechseln zum 01.09.2027 geplant.`);
    }
  }

  // 3. Neue Kinder zum Kitajahr 2027/28 und 2028/29 (auffüllen bis auf 1–2 freie Plätze; zählt Wechsel und schon geplante Kinder mit)
  let zaehler = 0;
  for (const termin of [SEPT27, SEPT28]) {
    const { data: frisch } = await sb
      .from("kinder")
      .select("id, gruppe_id, status, eintritt, austritt, buchungszeit_band_id")
      .eq("einrichtung_id", e.id)
      .is("archived_at", null);
    const frischKinder = frisch ?? [];
    const { data: historie } = await sb
      .from("kind_gruppen_historie")
      .select("kind_id, gruppe_id, gueltig_ab")
      .in("kind_id", frischKinder.map((k) => k.id))
      .lte("gueltig_ab", termin)
      .order("gueltig_ab", { ascending: false });
    // Gruppe zum Termin: jüngste Historie-Zeile bis dahin, sonst die aktuelle Gruppe
    const gruppeZumTermin = new Map<string, string | null>();
    for (const h of historie ?? []) if (!gruppeZumTermin.has(h.kind_id)) gruppeZumTermin.set(h.kind_id, h.gruppe_id);
    const gruppeVon = (k: { id: string; gruppe_id: string | null }) => (gruppeZumTermin.has(k.id) ? gruppeZumTermin.get(k.id) : k.gruppe_id);
    const jahrLabel = termin.slice(0, 4);

    for (const g of gruppen ?? []) {
      const bleiben = frischKinder.filter(
        (k) => gruppeVon(k) === g.id && (k.status === "aktiv" || k.status === "geplant") && (!k.eintritt || k.eintritt <= termin) && (!k.austritt || k.austritt > termin)
      ).length;
      const frei = Number(g.sollplatze) - bleiben;
      const liegenLassen = g.gruppenart === "krippe" ? 1 : 2;
      const neu = Math.max(0, frei - liegenLassen);
      if (neu === 0) continue;

      // häufigstes Buchungszeit-Band der Gruppe
      const baender = new Map<string, number>();
      for (const k of frischKinder.filter((x) => x.gruppe_id === g.id && x.buchungszeit_band_id)) baender.set(k.buchungszeit_band_id as string, (baender.get(k.buchungszeit_band_id as string) ?? 0) + 1);
      const band = [...baender].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const zeilen = [];
      for (let i = 0; i < neu; i++) {
        const weiblich = (zaehler + i) % 2 === 0;
        const vornamen = weiblich ? VORNAMEN_W : VORNAMEN_M;
        let vorname: string;
        let nachname: string;
        do {
          vorname = vornamen[namenZaehler.n % vornamen.length];
          nachname = NACHNAMEN[(namenZaehler.n * 7 + 3) % NACHNAMEN.length];
          namenZaehler.n += 1;
        } while (vergebeneNamen.has(`${vorname} ${nachname}`));
        vergebeneNamen.add(`${vorname} ${nachname}`);
        // Alter zum Eintritt: Krippe 8–26 Monate, Altersmischung 30–40, Kindergarten 36–44 Monate
        const alterMonate = g.gruppenart === "krippe" ? 8 + ((i * 5) % 19) : g.gruppenart === "altersgemischt" ? 30 + ((i * 3) % 11) : 36 + ((i * 3) % 9);
        const geb = addMonthsUtc(parseIsoDate(termin), -alterMonate);
        geb.setUTCDate(((i * 9) % 27) + 1);
        const geburtsdatum = toIsoDateString(geb);
        zeilen.push({
          einrichtung_id: e.id,
          gruppe_id: g.id,
          vorname,
          nachname,
          geburtsdatum,
          geschlecht: weiblich ? "weiblich" : "maennlich",
          status: "geplant",
          eintritt: termin,
          austritt: vorgeschlagenerAustritt(geburtsdatum, g.gruppenart === "krippe", parseIsoDate(termin)),
          buchungszeit_band_id: band,
          hat_behinderung: false,
        });
      }
      const { data: eingefuegt, error } = await sb.from("kinder").insert(zeilen).select("id");
      if (error) throw new Error(`Kinder (${g.name}): ${error.message}`);
      await sb.from("kind_buchungszeit_historie").insert((eingefuegt ?? []).map((k) => ({ kind_id: k.id, buchungszeit_band_id: band, gueltig_ab: termin })));
      zaehler += neu;
      console.log(`${e.name} / ${g.name}: ${neu} neue Kinder (geplant ab 01.09.${jahrLabel}), ${liegenLassen} Platz/Plätze bleiben frei.`);
    }
  }
}

async function personalBw() {
  const { data: e } = await sb.from("einrichtungen").select("id").eq("name", "Testkita Baden-Württemberg").eq("trager_id", (await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single()).data!.id).single();
  if (!e) return;
  const ziele: Record<string, number> = { Ganztagsgruppe: 100, Regelgruppe: 78, Kinderkrippe: 90 };
  const { data: gruppen } = await sb.from("gruppen").select("id, name").eq("einrichtung_id", e.id).is("archived_at", null);
  for (const g of gruppen ?? []) {
    const ziel = ziele[g.name];
    if (!ziel) continue;
    const { data: team } = await sb.from("team").select("id, wochenstunden").eq("gruppe_id", g.id).eq("status", "aktiv").is("archived_at", null);
    const summe = (team ?? []).reduce((s, t) => s + Number(t.wochenstunden ?? 0), 0);
    if (summe === 0 || Math.abs(summe - ziel) < 1) continue;
    const faktor = ziel / summe;
    for (const t of team ?? []) {
      const neu = Math.max(10, Math.round(Number(t.wochenstunden ?? 0) * faktor * 2) / 2);
      await sb.from("team").update({ wochenstunden: neu }).eq("id", t.id);
    }
    console.log(`Testkita Baden-Württemberg / ${g.name}: Personal ${summe} → ca. ${ziel} Wochenstunden.`);
  }
}

async function main() {
  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!traeger) throw new Error("Träger 'Villa Kunterbunt' fehlt.");
  const { data: einrichtungen } = await sb.from("einrichtungen").select("id, name").eq("trager_id", traeger.id).is("archived_at", null).order("name");
  const namenZaehler = { n: 0 };
  for (const e of einrichtungen ?? []) await bearbeiteEinrichtung(e, namenZaehler);
  await personalBw();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
