"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { MAX_STUFE } from "@/lib/marketing/ampel";

export type BewertungInput = {
  regionalleitungUserId: string | null;
  ampelPersonalbedarf: number | null;
  ampelPersonelleQualitaet: number | null;
  ampelPaedagogischeQualitaet: number | null;
  ampelBelegung: number | null;
  fehlendeStundenWoche: number | null;
  offeneStellen: number | null;
  freieU3: number | null;
  freieUe3: number | null;
  leitungPerformance: number | null;
  kommentar: string;
};

export type MarketingAktionErgebnis = { ok: true } | { ok: false; error: string };

const ganz = (n: number | null, min: number, max: number) => n === null || (Number.isInteger(n) && n >= min && n <= max);

/** Speichert die Marketing-Bewertung einer Einrichtung (eine Zeile je Einrichtung). Nur mit Marketing-Recht „bearbeiten“; die
 * Datenbank erzwingt dasselbe. Jede Änderung landet automatisch im Protokoll (Trigger). */
export async function speichereMarketingBewertung(einrichtungId: string, input: BewertungInput): Promise<MarketingAktionErgebnis> {
  if ((await getMarketingZugriff()) !== "bearbeiten") return { ok: false, error: "Dafür fehlt dir das Recht." };
  const stufenOk =
    ganz(input.ampelPersonalbedarf, 0, MAX_STUFE.personalbedarf) &&
    ganz(input.ampelPersonelleQualitaet, 0, MAX_STUFE.personelle_qualitaet) &&
    ganz(input.ampelPaedagogischeQualitaet, 0, MAX_STUFE.paedagogische_qualitaet) &&
    ganz(input.ampelBelegung, 0, MAX_STUFE.belegung);
  if (!stufenOk) return { ok: false, error: "Ungültige Ampelstufe." };
  if (!ganz(input.offeneStellen, 0, 1000) || !ganz(input.freieU3, 0, 1000) || !ganz(input.freieUe3, 0, 1000) || !ganz(input.leitungPerformance, 1, 10)) {
    return { ok: false, error: "Bitte gültige Zahlen eintragen (Leitungsperformance 1–10)." };
  }
  if (input.fehlendeStundenWoche !== null && !(input.fehlendeStundenWoche >= 0 && input.fehlendeStundenWoche <= 10000)) return { ok: false, error: "Ungültige Stundenzahl." };
  if (input.kommentar.length > 2000) return { ok: false, error: "Der Kommentar ist zu lang." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: alt } = await supabase.from("marketing_bewertung").select("*").eq("einrichtung_id", einrichtungId).maybeSingle();
  const ampelGeaendert =
    !alt ||
    alt.ampel_personalbedarf !== input.ampelPersonalbedarf ||
    alt.ampel_personelle_qualitaet !== input.ampelPersonelleQualitaet ||
    alt.ampel_paedagogische_qualitaet !== input.ampelPaedagogischeQualitaet ||
    alt.ampel_belegung !== input.ampelBelegung;

  const { error } = await supabase.from("marketing_bewertung").upsert(
    {
      einrichtung_id: einrichtungId,
      regionalleitung_user_id: input.regionalleitungUserId,
      ampel_personalbedarf: input.ampelPersonalbedarf,
      ampel_personelle_qualitaet: input.ampelPersonelleQualitaet,
      ampel_paedagogische_qualitaet: input.ampelPaedagogischeQualitaet,
      ampel_belegung: input.ampelBelegung,
      fehlende_stunden_woche: input.fehlendeStundenWoche,
      offene_stellen: input.offeneStellen,
      freie_plaetze_u3: input.freieU3,
      freie_plaetze_ue3: input.freieUe3,
      leitung_performance: input.leitungPerformance,
      kommentar: input.kommentar.trim() || null,
      bewertet_am: ampelGeaendert ? new Date().toISOString() : (alt?.bewertet_am ?? null),
      bewertet_von: ampelGeaendert ? user.id : (alt?.bewertet_von ?? null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "einrichtung_id" }
  );
  if (error) return { ok: false, error: "Speichern hat nicht geklappt." };
  revalidatePath("/marketing");
  revalidatePath(`/marketing/einrichtungen/${einrichtungId}`);
  return { ok: true };
}
