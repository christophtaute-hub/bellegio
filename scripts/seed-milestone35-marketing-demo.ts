/**
 * Marketing-Ampel: Beispielbewertungen und -kampagnen für die sechs Demo-Einrichtungen des Quell-Trägers (Villa Kunterbunt).
 * Danach `scripts/demo-einrichten.ts` laufen lassen (kopiert die Marketing-Daten in „Bellegio Demo“). Die Termine sind relativ
 * zum Tag des Laufs — vor der Präsentation erneut ausführen, damit „endet in 5 Tagen“ usw. stimmen.
 *   npx tsx --env-file=.env.local scripts/seed-milestone35-marketing-demo.ts
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tag = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const zeit = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString();

type Bew = { pb: number; pq: number; paed: number; bel: number; fehlend?: number; stellen?: number; u3?: number; ue3?: number; leitung?: number; kommentar?: string; bewertetVor: number };
type Kamp = Database["public"]["Tables"]["marketing_kampagne"]["Insert"];

const PLAN: Record<string, { bewertung: Bew; kampagnen: Omit<Kamp, "einrichtung_id">[] }> = {
  "Kita Sonnenschein": {
    bewertung: { pb: 0, pq: 1, paed: 0, bel: 3, u3: 0, ue3: 6, leitung: 6, kommentar: "Sechs Abgänge im September, bisher keine Nachfrage aus der Warteliste.", bewertetVor: 3 },
    kampagnen: [],
  },
  "Testkita Bayern": {
    bewertung: { pb: 2, pq: 0, paed: 0, bel: 0, fehlend: 18, stellen: 1, u3: 0, ue3: 0, leitung: 8, kommentar: "Zwei Austritte zum 31.03.2027 — Nachbesetzung ab Januar suchen.", bewertetVor: 5 },
    kampagnen: [
      { art: "personal", kanal: "meta", beworbenes: "Erzieher/in 30 Std.", anzahl: 1, beginn: tag(-20), ende: tag(5), status: "aktiv", budget: 800, kosten: 560, links: ["https://www.facebook.com/ads/library"], naechster_schritt: "Bewerbungen sichten", schritt_faellig: tag(2), kommentar: "Drei Bewerbungen eingegangen." },
    ],
  },
  "Kita Regenbogen": {
    bewertung: { pb: 1, pq: 0, paed: 0, bel: 1, fehlend: 8, stellen: 0, u3: 1, ue3: 1, leitung: 7, bewertetVor: 10 },
    kampagnen: [{ art: "belegung", kanal: "google", beworbenes: "2 freie Plätze ab Januar", anzahl: 2, beginn: tag(10), ende: tag(60), status: "geplant", budget: 500, kosten: 0, links: [], naechster_schritt: "Anzeigentexte freigeben", schritt_faellig: tag(7) }],
  },
  "Testkita Baden-Württemberg": {
    bewertung: { pb: 0, pq: 0, paed: 0, bel: 0, u3: 0, ue3: 0, leitung: 9, bewertetVor: 45 },
    kampagnen: [],
  },
  "Kita Löwenzahn": {
    bewertung: { pb: 3, pq: 2, paed: 1, bel: 2, fehlend: 44, stellen: 2, u3: 1, ue3: 3, leitung: 3, kommentar: "Leitungswechsel steht an, Team angespannt.", bewertetVor: 2 },
    kampagnen: [
      { art: "personal", kanal: "meta", beworbenes: "Fachkraft 39 Std.", anzahl: 2, beginn: tag(-40), ende: tag(-3), status: "aktiv", budget: 1200, kosten: 1180, links: ["https://www.example.com/jobs"], naechster_schritt: "Verlängern oder beenden", schritt_faellig: tag(-2) },
      { art: "belegung", kanal: "google", beworbenes: "4 Betreuungsplätze", anzahl: 4, beginn: tag(-14), ende: tag(30), status: "pausiert", budget: 600, kosten: 210, links: [], kommentar: "Pausiert wegen Umbau." },
    ],
  },
  "Testkita Nordrhein-Westfalen": {
    bewertung: { pb: 0, pq: 0, paed: 1, bel: 3, u3: 2, ue3: 6, leitung: 7, bewertetVor: 6 },
    kampagnen: [{ art: "belegung", kanal: "meta", beworbenes: "8 Plätze", anzahl: 8, beginn: tag(-90), ende: tag(-60), status: "beendet", budget: 700, kosten: 690, links: [] }],
  },
};

async function main() {
  const { data: traeger } = await sb.from("trager").select("id").eq("name", "Villa Kunterbunt").single();
  const { data: einrichtungen } = await sb.from("einrichtungen").select("id, name, bundesland_code").eq("trager_id", traeger!.id).is("archived_at", null);
  const { data: profile } = await sb.from("user_profiles").select("id, full_name").eq("trager_id", traeger!.id).eq("role", "traeger_admin").limit(1);
  const leitung = profile?.[0]?.id ?? null;

  for (const e of einrichtungen ?? []) {
    const plan = PLAN[e.name];
    if (!plan) continue;
    const b = plan.bewertung;
    const { error } = await sb.from("marketing_bewertung").upsert(
      {
        einrichtung_id: e.id,
        regionalleitung_user_id: e.bundesland_code === "by" ? leitung : null,
        ampel_personalbedarf: b.pb,
        ampel_personelle_qualitaet: b.pq,
        ampel_paedagogische_qualitaet: b.paed,
        ampel_belegung: b.bel,
        fehlende_stunden_woche: b.fehlend ?? 0,
        offene_stellen: b.stellen ?? 0,
        freie_plaetze_u3: b.u3 ?? 0,
        freie_plaetze_ue3: b.ue3 ?? 0,
        leitung_performance: b.leitung ?? null,
        kommentar: b.kommentar ?? null,
        bewertet_am: zeit(-b.bewertetVor),
        bewertet_von: leitung,
        updated_at: zeit(-b.bewertetVor),
      },
      { onConflict: "einrichtung_id" }
    );
    if (error) throw error;
    await sb.from("marketing_kampagne").delete().eq("einrichtung_id", e.id);
    if (plan.kampagnen.length > 0) {
      const { error: ke } = await sb.from("marketing_kampagne").insert(plan.kampagnen.map((k) => ({ ...k, einrichtung_id: e.id, verantwortlich_user_id: leitung })));
      if (ke) throw ke;
    }
    console.log(`✓ ${e.name}`);
  }
  console.log("Fertig. Jetzt: npx tsx --env-file=.env.local scripts/demo-einrichten.ts");
}
main();
