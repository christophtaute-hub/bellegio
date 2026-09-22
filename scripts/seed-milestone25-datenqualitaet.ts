/**
 * NICHT MEHR AUSFÜHREN: Die hier vergebenen `platznummer`-Werte ("BY-05" o.ä.) waren genau die Ursache der
 * Milestone-27-Rückmeldung ("Platz soll einfach 1 bis 25 sein") — die Gruppen-Seite zeigt seit Milestone 27 einen
 * berechneten Sitzplatz statt `platznummer`. Auch `notizen` wird seither nicht mehr befüllt, sondern über
 * `kind_notizen_verlauf` (siehe lib/actions/kinder.ts, `fuegeNotizHinzu`). Ein erneuter Lauf würde beides wieder
 * mit veralteten Werten überschreiben.
 *
 * Milestone 25, Phase 7: realistischere Demo-/Testdaten für die drei Testkitas unter "Villa Kunterbunt"
 * (wirken über scripts/demo-einrichten.ts beim nächsten Zurücksetzen automatisch auch im Demo-Zugang).
 *
 * - Notizen, Wohnort (Bayern/NRW — Baden-Württemberg hat sie bereits für die Auswärtigen-Quote-Demo),
 *   Platznummer, Vertrag-gültig-bis und Einschulungsstatus auf ca. 85 % befüllen (nur wo noch leer,
 *   bewusst nicht 100 %, damit es wie echte Daten aussieht) — Bayerns Anstellungsschlüssel hängt nur an
 *   den Gewichtungsfaktoren, nicht an diesen Feldern, die April-2027-Demo bleibt also unberührt.
 * - Je Kita eine Ausfallzeit: eine laufende Schwangerschaft (Bayern, zeigt den neuen Dashboard-Hinweis),
 *   eine bereits beendete Krankheit (Baden-Württemberg) und ein Sonderurlaub (NRW, der bewusst KEINEN
 *   Dashboard-Hinweis auslöst) — jeweils nur, wenn noch niemand in der Kita eine Ausfallzeit hat.
 * - Je Kita ein echter Buchungszeit-Wechsel eines Kindes: die Historie bekommt ein "vorher"-Band ab
 *   Eintritt und ein "nachher"-Band (= das heute hinterlegte) ab einem Datum vor einigen Monaten — als
 *   Vorführung der neuen Buchungszeit-Historie. `kinder.buchungszeit_band_id` bleibt unverändert (ist ja
 *   bereits der aktuelle Wert), nur der Verlauf davor wird ergänzt.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone25-datenqualitaet.ts
 * Idempotent: füllt nur leere Felder, überschreibt nichts Vorhandenes.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const NOTIZEN_POOL = [
  "Nussallergie — bitte an alle Betreuungspersonen weitergeben.",
  "Wird montags und mittwochs von den Großeltern abgeholt.",
  "Schläft mittags gern etwas länger.",
  "Trägt eine Brille, beim Toben bitte im Blick behalten.",
  "Isst kein Schweinefleisch.",
  "Mag besonders gern Bilderbücher und Musik.",
  "Ist noch neu in der Gruppe, braucht etwas Eingewöhnungszeit.",
  "Abholberechtigt sind ausschließlich die Eltern, siehe Vermerk in der Akte.",
  "Heuschnupfen im Frühling — Medikamente sind in der Kita-Tasche.",
  "Spricht zu Hause zweisprachig, versteht aber alles auf Deutsch.",
  "Hat manchmal Bauchschmerzen vor dem Mittagessen, bitte in Ruhe lassen.",
  "Mag es, beim Aufräumen zu helfen.",
];

const WOHNORT_MUENCHEN = ["München", "München", "München", "Unterhaching", "Gräfelfing", "Unterföhring"];
const WOHNORT_KOELN = ["Köln", "Köln", "Köln", "Leverkusen", "Hürth", "Bergisch Gladbach"];

const heute = new Date();
const heuteIso = heute.toISOString().slice(0, 10);

function monateZurueck(monate: number): string {
  const d = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() - monate, heute.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

function alterInJahren(geburtsdatum: string): number {
  const [gj, gm, gt] = geburtsdatum.split("-").map(Number);
  let alter = heute.getUTCFullYear() - gj;
  if (heute.getUTCMonth() + 1 < gm || (heute.getUTCMonth() + 1 === gm && heute.getUTCDate() < gt)) alter -= 1;
  return alter;
}

function tageSpaeter(datumIso: string, tage: number): string {
  const [j, m, t] = datumIso.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

function naechsterAugust(): string {
  const jahr = heute.getUTCMonth() + 1 <= 8 ? heute.getUTCFullYear() : heute.getUTCFullYear() + 1;
  return `${jahr}-08-31`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local).");
    process.exit(1);
  }
  const sb = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data: trager } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!trager) throw new Error('Träger "Villa Kunterbunt" nicht gefunden.');

  const { data: einrichtungen } = await sb
    .from("einrichtungen")
    .select("id, name, bundesland_code, address_city")
    .eq("trager_id", trager.id)
    .is("archived_at", null);
  if (!einrichtungen || einrichtungen.length === 0) throw new Error("Keine Einrichtungen gefunden.");

  let notizenGesetzt = 0;
  let wohnortGesetzt = 0;
  let platznummerGesetzt = 0;
  let vertragGesetzt = 0;
  let einschulungGesetzt = 0;

  for (const e of einrichtungen) {
    const { data: kinder } = await sb
      .from("kinder")
      .select("id, geburtsdatum, gruppe_id, status, notizen, wohnort, platznummer, vertrag_gueltig_bis, einschulungsstatus")
      .eq("einrichtung_id", e.id)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .order("id");
    if (!kinder || kinder.length === 0) continue;

    const { data: gruppen } = await sb.from("gruppen").select("id, gruppenart").eq("einrichtung_id", e.id);
    const kindergartenGruppen = new Set((gruppen ?? []).filter((g) => g.gruppenart === "kindergarten").map((g) => g.id));
    const wohnortPool = e.bundesland_code === "by" ? WOHNORT_MUENCHEN : e.bundesland_code === "nrw" ? WOHNORT_KOELN : null;

    let platzZaehler = 1;
    for (let i = 0; i < kinder.length; i++) {
      const k = kinder[i];
      const patch: Database["public"]["Tables"]["kinder"]["Update"] = {};

      // ~85 % befüllen: jedes siebte Kind bleibt bewusst leer, wie in echten Daten.
      const fuelleFeld = i % 7 !== 0;

      if (!k.notizen && fuelleFeld) {
        patch.notizen = NOTIZEN_POOL[i % NOTIZEN_POOL.length];
      }
      if (!k.wohnort && wohnortPool && fuelleFeld) {
        patch.wohnort = wohnortPool[i % wohnortPool.length];
      }
      if (!k.platznummer && fuelleFeld) {
        patch.platznummer = `${e.name.includes("Bayern") ? "BY" : e.name.includes("Nordrhein") ? "NRW" : "BW"}-${String(platzZaehler).padStart(2, "0")}`;
      }
      platzZaehler += 1;

      const istAeltererKindergartenKind = k.gruppe_id && kindergartenGruppen.has(k.gruppe_id) && alterInJahren(k.geburtsdatum) >= 5;
      if (istAeltererKindergartenKind && !k.vertrag_gueltig_bis && fuelleFeld) {
        patch.vertrag_gueltig_bis = naechsterAugust();
      }
      if (istAeltererKindergartenKind && !k.einschulungsstatus && fuelleFeld) {
        patch.einschulungsstatus = (["muss", "kann", "korridor"] as const)[i % 3];
      }

      if (Object.keys(patch).length === 0) continue;
      const { error } = await sb.from("kinder").update(patch).eq("id", k.id);
      if (error) {
        console.error(`Kind ${k.id} (${e.name}) konnte nicht aktualisiert werden:`, error.message);
        continue;
      }
      if (patch.notizen) notizenGesetzt++;
      if (patch.wohnort) wohnortGesetzt++;
      if (patch.platznummer) platznummerGesetzt++;
      if (patch.vertrag_gueltig_bis) vertragGesetzt++;
      if (patch.einschulungsstatus) einschulungGesetzt++;
    }
  }
  console.log(
    `Kinder aktualisiert — Notizen: ${notizenGesetzt}, Wohnort: ${wohnortGesetzt}, Platznummer: ${platznummerGesetzt}, ` +
      `Vertrag gültig bis: ${vertragGesetzt}, Einschulungsstatus: ${einschulungGesetzt}.`
  );

  // Ausfallzeiten: je Kita ein realistischer Fall, nur wenn dort noch niemand eine Ausfallzeit hat.
  const AUSFALL_PLAN: { kita: string; name: string; art: "schwangerschaft" | "krankheit" | "sonderurlaub"; von: string; bis: string | null }[] = [
    { kita: "Testkita Bayern", name: "Sarah Lang", art: "schwangerschaft", von: monateZurueck(2), bis: null },
    { kita: "Testkita Baden-Württemberg", name: "Nadine Böhm", art: "krankheit", von: monateZurueck(1), bis: tageSpaeter(monateZurueck(1), 16) },
    { kita: "Testkita Nordrhein-Westfalen", name: "Laura Busch", art: "sonderurlaub", von: monateZurueck(1), bis: tageSpaeter(monateZurueck(1), 9) },
  ];
  for (const plan of AUSFALL_PLAN) {
    const einrichtung = einrichtungen.find((e) => e.name === plan.kita);
    if (!einrichtung) continue;
    const { count } = await sb
      .from("team_ausfallzeiten")
      .select("id, team!inner(einrichtung_id)", { count: "exact", head: true })
      .eq("team.einrichtung_id", einrichtung.id);
    if ((count ?? 0) > 0) continue; // schon vorhanden — nichts tun (idempotent)

    const [vorname, nachname] = plan.name.split(" ");
    const { data: person } = await sb
      .from("team")
      .select("id")
      .eq("einrichtung_id", einrichtung.id)
      .eq("vorname", vorname)
      .eq("nachname", nachname)
      .single();
    if (!person) {
      console.warn(`${plan.name} in ${plan.kita} nicht gefunden — Ausfallzeit übersprungen.`);
      continue;
    }
    const { error } = await sb.from("team_ausfallzeiten").insert({ team_id: person.id, art: plan.art, von: plan.von, bis: plan.bis });
    if (error) console.error(`Ausfallzeit für ${plan.name} konnte nicht angelegt werden:`, error.message);
    else console.log(`Ausfallzeit angelegt: ${plan.name} (${plan.kita}) — ${plan.art} seit ${plan.von}${plan.bis ? ` bis ${plan.bis}` : ""}.`);
  }

  // Ein echter Buchungszeit-Wechsel je Kita, als Vorführung der neuen Historie.
  for (const e of einrichtungen) {
    const { data: kandidat } = await sb
      .from("kinder")
      .select("id, vorname, nachname, eintritt, buchungszeit_band_id")
      .eq("einrichtung_id", e.id)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .not("buchungszeit_band_id", "is", null)
      .lte("eintritt", monateZurueck(8))
      .order("id")
      .limit(1)
      .maybeSingle();
    if (!kandidat || !kandidat.buchungszeit_band_id || !kandidat.eintritt) continue;

    const { count: historieAnzahl } = await sb
      .from("kind_buchungszeit_historie")
      .select("id", { count: "exact", head: true })
      .eq("kind_id", kandidat.id);
    if ((historieAnzahl ?? 0) > 1) continue; // schon ein Wechsel erfasst — nichts tun (idempotent)

    const { data: baender } = await sb
      .from("booking_time_bands")
      .select("id, sort_order")
      .eq("bundesland_code", e.bundesland_code)
      .order("sort_order");
    const aktuellerIndex = (baender ?? []).findIndex((b) => b.id === kandidat.buchungszeit_band_id);
    const vorherigesBand = aktuellerIndex > 0 ? baender![aktuellerIndex - 1] : null;
    if (!vorherigesBand) continue; // schon das kleinste Band — kein plausibles "vorher" darstellbar

    const wechselDatum = monateZurueck(4);
    // Bestehende Basiszeile (gueltig_ab = Eintritt, aktuelles Band) auf das frühere Band umstellen …
    const { error: updateError } = await sb
      .from("kind_buchungszeit_historie")
      .update({ buchungszeit_band_id: vorherigesBand.id })
      .eq("kind_id", kandidat.id)
      .eq("gueltig_ab", kandidat.eintritt);
    // … und ab dem Wechseldatum eine neue Zeile mit dem heutigen (aktuellen) Band ergänzen.
    const { error: insertError } = await sb
      .from("kind_buchungszeit_historie")
      .insert({ kind_id: kandidat.id, buchungszeit_band_id: kandidat.buchungszeit_band_id, gueltig_ab: wechselDatum });
    if (updateError || insertError) {
      console.error(`Buchungszeit-Historie für ${kandidat.vorname} ${kandidat.nachname} (${e.name}) fehlgeschlagen:`, updateError?.message ?? insertError?.message);
    } else {
      console.log(`Buchungszeit-Wechsel angelegt: ${kandidat.vorname} ${kandidat.nachname} (${e.name}) — ab ${wechselDatum}.`);
    }
  }

  console.log(`\nFertig (Stand ${heuteIso}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
