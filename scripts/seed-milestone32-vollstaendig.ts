/**
 * Milestone 32, Vollständigkeit der Demo-Daten: je Bundesland alle Felder realistisch befüllt (Quell-Träger
 * "Villa Kunterbunt", danach scripts/demo-einrichten.ts für den Demo-Zugang).
 *
 * - Einrichtungen (Anschrift der drei älteren Testkitas, Löschfrist 12 Monate) sind NICHT Teil dieses Skripts: der Spalten-Guard-Trigger
 *   auf `einrichtungen` erlaubt Änderungen nur im Kontext eines Träger-Admins. Sie wurden per SQL mit gesetztem JWT-Kontext gesetzt.
 * - Kinder (aktiv + Nachrücker): Wohnort (alle Bundesländer), Notizen-Verlauf, Vertrag gültig bis (Kitajahresende, spätestens
 *   Austritt), Einschulungsstatus für die Schulkind-Jahrgänge (Muss/Kann/Korridor nach Stichtagsregel des Bundeslands,
 *   vereinfacht), fehlende Bayern-Gewichtungsfaktoren.
 * - Team: je Kita eine abgeschlossene Krankheit und ein kurzer Sonderurlaub in der Zukunft, in NRW (Löwenzahn) ein Mutterschutz,
 *   je Kita eine Monatsstunden-Abweichung (Aufstockung Nov–Jan), in der Testkita BW eine Ergänzungskraft.
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone32-vollstaendig.ts
 * Idempotent: füllt nur, was noch leer ist. Wohnorte in Baden-Württemberg (Auswärtigen-Quote-Demo) bleiben unangetastet.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type Bundesland = "by" | "bw" | "nrw";

const WOHNORTE: Record<string, string[]> = {
  "Kita Sonnenschein": ["Augsburg", "Augsburg", "Augsburg", "Friedberg", "Neusäß", "Gersthofen"],
  "Testkita Bayern": ["München", "München", "München", "Unterhaching", "Gräfelfing", "Unterföhring"],
  "Kita Regenbogen": ["Karlsruhe", "Karlsruhe", "Karlsruhe", "Ettlingen", "Stutensee"],
  "Testkita Baden-Württemberg": ["Stuttgart", "Stuttgart", "Stuttgart", "Fellbach", "Esslingen"],
  "Kita Löwenzahn": ["Düsseldorf", "Düsseldorf", "Düsseldorf", "Neuss", "Ratingen", "Meerbusch"],
  "Testkita Nordrhein-Westfalen": ["Köln", "Köln", "Köln", "Leverkusen", "Hürth", "Bergisch Gladbach"],
};

const NOTIZEN = [
  "Nussallergie — bitte an alle Betreuungspersonen weitergeben.",
  "Wird montags und mittwochs von den Großeltern abgeholt.",
  "Schläft mittags gern etwas länger.",
  "Trägt eine Brille, beim Toben bitte im Blick behalten.",
  "Isst kein Schweinefleisch.",
  "Mag besonders gern Bilderbücher und Musik.",
  "Eingewöhnung verlief gut, Eltern sind sehr zugewandt.",
  "Abholberechtigt sind ausschließlich die Eltern, siehe Vermerk in der Akte.",
  "Heuschnupfen im Frühling — Medikamente liegen in der Kita-Tasche.",
  "Spricht zu Hause zweisprachig, versteht alles auf Deutsch.",
  "Mag es, beim Aufräumen zu helfen.",
  "Braucht beim Ankommen morgens ein paar Minuten Ruhe.",
  "Laktoseintoleranz — Ersatzprodukte beim Frühstück.",
  "Eltern wünschen ein Entwicklungsgespräch im Frühjahr.",
];
const NOTIZEN_NACHRUECKER = [
  "Aufnahmegespräch geführt, Eltern warten auf einen freien Platz.",
  "Geschwisterkind in der Einrichtung, bei Platzvergabe bevorzugt.",
  "Wunschtermin für die Aufnahme laut Eltern: nach den Sommerferien.",
];
const NOTIZ_I_KIND = "I-Status: Integrationsmaßnahme bewilligt, Therapeutin kommt einmal pro Woche in die Gruppe.";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function tageVon(heute: Date, tage: number): string {
  return iso(new Date(heute.getTime() + tage * 86400000));
}

/** Einschulung zum Schuljahr 2027/28 bzw. früher: Stichtagsregeln vereinfacht — BY: bis 30.06. Muss, 01.07.–30.09. Korridor,
 * danach Kann; BW: bis 30.06. Muss, danach Kann; NRW: bis 30.09. Muss, danach Kann. */
function einschulung(bl: Bundesland, geburtsdatum: string): "muss" | "kann" | "korridor" | null {
  if (geburtsdatum < "2020-10-01" || geburtsdatum > "2021-12-31") return null;
  const jahr = geburtsdatum.slice(0, 4);
  if (jahr === "2020") return "muss";
  if (bl === "nrw") return geburtsdatum <= "2021-09-30" ? "muss" : "kann";
  if (geburtsdatum <= "2021-06-30") return "muss";
  if (bl === "by") return geburtsdatum <= "2021-09-30" ? "korridor" : "kann";
  return "kann";
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  const sb = createClient<Database>(url, key);
  const heute = new Date();
  const kitajahrEnde = heute.getUTCMonth() >= 8 ? `${heute.getUTCFullYear() + 1}-08-31` : `${heute.getUTCFullYear()}-08-31`;

  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  if (!traeger) throw new Error("Träger Villa Kunterbunt nicht gefunden.");
  const { data: einrichtungen } = await sb
    .from("einrichtungen")
    .select("id, name, bundesland_code")
    .eq("trager_id", traeger.id)
    .is("archived_at", null);
  if (!einrichtungen) throw new Error("Keine Einrichtungen.");

  const { data: faktoren } = await sb.from("weighting_factors").select("id, code").eq("bundesland_code", "by");
  const faktorId = new Map((faktoren ?? []).map((f) => [f.code, f.id]));

  const zaehler = { wohnort: 0, notiz: 0, vertrag: 0, einschul: 0, faktor: 0, ausfall: 0, stunden: 0, person: 0 };

  for (const e of einrichtungen) {
    const bl = e.bundesland_code as Bundesland;

    // Kinder
    const { data: gruppen } = await sb.from("gruppen").select("id, gruppenart").eq("einrichtung_id", e.id);
    const gruppenart = new Map((gruppen ?? []).map((g) => [g.id, g.gruppenart]));
    const { data: kinder } = await sb
      .from("kinder")
      .select("id, geburtsdatum, gruppe_id, status, wohnort, vertrag_gueltig_bis, einschulungsstatus, austritt, hat_behinderung, eintritt")
      .eq("einrichtung_id", e.id)
      .in("status", ["aktiv", "nachruecker"])
      .is("archived_at", null)
      .order("id");
    const ids = (kinder ?? []).map((k) => k.id);
    const { data: mitNotiz } = ids.length
      ? await sb.from("kind_notizen_verlauf").select("kind_id").in("kind_id", ids)
      : { data: [] };
    const hatNotiz = new Set((mitNotiz ?? []).map((n) => n.kind_id));
    const { data: mitFaktor } = ids.length
      ? await sb.from("kind_weighting_factors").select("kind_id").in("kind_id", ids)
      : { data: [] };
    const hatFaktor = new Set((mitFaktor ?? []).map((n) => n.kind_id));

    const wohnortPool = WOHNORTE[e.name] ?? [];
    let nr = 0;
    for (const k of kinder ?? []) {
      nr += 1;
      const upd: Database["public"]["Tables"]["kinder"]["Update"] = {};
      if (!k.wohnort && wohnortPool.length > 0) {
        upd.wohnort = wohnortPool[nr % wohnortPool.length];
        zaehler.wohnort += 1;
      }
      if (!k.vertrag_gueltig_bis && k.status === "aktiv") {
        upd.vertrag_gueltig_bis = k.austritt && k.austritt < kitajahrEnde ? k.austritt : kitajahrEnde;
        zaehler.vertrag += 1;
      }
      if (!k.einschulungsstatus && k.status === "aktiv" && gruppenart.get(k.gruppe_id ?? "") !== "krippe") {
        const status = einschulung(bl, k.geburtsdatum);
        if (status) {
          upd.einschulungsstatus = status;
          zaehler.einschul += 1;
        }
      }
      if (Object.keys(upd).length > 0) {
        const { error } = await sb.from("kinder").update(upd).eq("id", k.id);
        if (error) throw new Error(`Kind ${k.id}: ${error.message}`);
      }

      if (!hatNotiz.has(k.id)) {
        const text = k.hat_behinderung
          ? NOTIZ_I_KIND
          : k.status === "nachruecker"
            ? NOTIZEN_NACHRUECKER[nr % NOTIZEN_NACHRUECKER.length]
            : NOTIZEN[nr % NOTIZEN.length];
        const erstellt = new Date(heute.getTime() - ((nr * 5) % 150 + 3) * 86400000).toISOString();
        const { error } = await sb.from("kind_notizen_verlauf").insert({ kind_id: k.id, text, erstellt_am: erstellt });
        if (error) throw new Error(`Notiz ${k.id}: ${error.message}`);
        zaehler.notiz += 1;
      }

      if (bl === "by" && !hatFaktor.has(k.id)) {
        const code = gruppenart.get(k.gruppe_id ?? "") === "krippe" ? "u3" : "ue3_bis_schuleintritt";
        const fid = faktorId.get(code);
        if (fid) {
          const { error } = await sb.from("kind_weighting_factors").insert({ kind_id: k.id, weighting_factor_id: fid });
          if (error) throw new Error(`Faktor ${k.id}: ${error.message}`);
          zaehler.faktor += 1;
        }
      }
    }

    // Team
    const { data: team } = await sb
      .from("team")
      .select("id, vorname, nachname, wochenstunden, role_category, gruppe_id, status")
      .eq("einrichtung_id", e.id)
      .eq("status", "aktiv")
      .is("archived_at", null)
      .order("nachname");
    const personen = team ?? [];
    if (personen.length < 4) continue;
    const { data: ausfaelle } = await sb.from("team_ausfallzeiten").select("team_id, art").in("team_id", personen.map((p) => p.id));
    const hatArt = (art: string) => (ausfaelle ?? []).some((a) => a.art === art);
    const hatAusfall = new Set((ausfaelle ?? []).map((a) => a.team_id));
    const frei = personen.filter((p) => !hatAusfall.has(p.id));

    const neu: { team_id: string; art: string; von: string; bis: string | null; notizen: string }[] = [];
    if (!hatArt("krankheit") && frei[0]) neu.push({ team_id: frei[0].id, art: "krankheit", von: tageVon(heute, -20), bis: tageVon(heute, -9), notizen: "Grippe, mit Attest" });
    if (!hatArt("sonderurlaub") && frei[1]) neu.push({ team_id: frei[1].id, art: "sonderurlaub", von: tageVon(heute, 25), bis: tageVon(heute, 29), notizen: "Umzug" });
    if (e.name === "Kita Löwenzahn" && !hatArt("mutterschutz") && frei[2]) {
      neu.push({ team_id: frei[2].id, art: "mutterschutz", von: "2027-01-15", bis: "2027-05-31", notizen: "Mutterschutz, Rückkehr geplant" });
    }
    if (neu.length > 0) {
      const { error } = await sb.from("team_ausfallzeiten").insert(neu);
      if (error) throw new Error(`Ausfallzeiten ${e.name}: ${error.message}`);
      zaehler.ausfall += neu.length;
    }

    // Monatsstunden: Aufstockung um 5 Std. von November bis Januar (Vertretung), nur wenn noch kein Eintrag existiert
    const kandidat = personen.find((p) => (p.wochenstunden ?? 0) <= 34 && !hatAusfall.has(p.id)) ?? personen[personen.length - 1];
    const { count } = await sb.from("team_monthly_hours").select("id", { count: "exact", head: true }).eq("team_id", kandidat.id);
    if ((count ?? 0) === 0) {
      const jahr = heute.getUTCFullYear();
      const monate = [`${jahr}-11-01`, `${jahr}-12-01`, `${jahr + 1}-01-01`];
      const { error } = await sb
        .from("team_monthly_hours")
        .insert(monate.map((month) => ({ team_id: kandidat.id, month, wochenstunden: Math.min(Number(kandidat.wochenstunden ?? 0) + 5, 39) })));
      if (error) throw new Error(`Monatsstunden ${e.name}: ${error.message}`);
      zaehler.stunden += 3;
    }

    // Ergänzungskraft für die Testkita BW (hatte keine)
    if (e.name === "Testkita Baden-Württemberg" && !personen.some((p) => p.role_category === "ek")) {
      const { data: person, error } = await sb
        .from("team")
        .insert({
          einrichtung_id: e.id,
          gruppe_id: personen[0].gruppe_id,
          vorname: "Ines",
          nachname: "Wolf",
          rolle: "Ergänzungskraft",
          wochenstunden: 25,
          fachkraft: false,
          status: "aktiv",
          eintritt: "2023-09-01",
          role_category: "ek",
        })
        .select("id")
        .single();
      if (error || !person) throw new Error(`Ergänzungskraft: ${error?.message}`);
      const { error: ve } = await sb.from("team_verguetung").insert({ team_id: person.id, einrichtung_id: e.id, entgeltgruppe: "S4", stufe: 3, monatsgehalt_manuell: null });
      if (ve) throw new Error(`Vergütung Ergänzungskraft: ${ve.message}`);
      zaehler.person += 1;
    }
  }

  console.log("Befüllt:", zaehler);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
