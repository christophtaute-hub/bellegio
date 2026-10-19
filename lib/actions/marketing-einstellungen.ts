"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { AMPEL_ARTEN, MAX_STUFE, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import type { MarketingAktionErgebnis } from "@/lib/actions/marketing-bewertung";

export type EinstellungenInput = {
  kampagneEndetInTagen: number;
  bewertungVeraltetNachTagen: number;
  grenzen: { personalbedarf: [number, number, number]; belegung: [number, number, number] };
  kriterien: Record<MarketingAmpelArt, string[]>;
};

const tripelOk = (t: number[]) => t.length === 3 && t.every((n) => Number.isFinite(n) && n >= 0 && n <= 10000) && t[0] <= t[1] && t[1] <= t[2];

/** Speichert Kriterien, Grenzwerte und Fristen der Marketing-Ampel (je Träger). Nur mit Marketing-Recht „bearbeiten“. */
export async function speichereMarketingEinstellungen(input: EinstellungenInput): Promise<MarketingAktionErgebnis> {
  if ((await getMarketingZugriff()) !== "bearbeiten") return { ok: false, error: "Dafür fehlt dir das Recht." };
  if (!Number.isInteger(input.kampagneEndetInTagen) || input.kampagneEndetInTagen < 1 || input.kampagneEndetInTagen > 90) return { ok: false, error: "Frist „Kampagne endet“: 1–90 Tage." };
  if (!Number.isInteger(input.bewertungVeraltetNachTagen) || input.bewertungVeraltetNachTagen < 1 || input.bewertungVeraltetNachTagen > 365) return { ok: false, error: "Frist „Bewertung veraltet“: 1–365 Tage." };
  if (!tripelOk(input.grenzen.personalbedarf) || !tripelOk(input.grenzen.belegung)) return { ok: false, error: "Grenzwerte: drei aufsteigende Zahlen (Gelb ab, Orange ab, Rot ab)." };
  for (const art of AMPEL_ARTEN) {
    const texte = input.kriterien[art];
    if (!Array.isArray(texte) || texte.length !== MAX_STUFE[art] + 1 || texte.some((t) => typeof t !== "string" || t.length > 200)) return { ok: false, error: "Ein Kriterientext ist ungültig oder zu lang." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { data: profil } = await supabase.from("user_profiles").select("trager_id").eq("id", user.id).single();
  if (!profil) return { ok: false, error: "Profil nicht gefunden." };

  const { error } = await supabase.from("marketing_einstellungen").upsert(
    {
      trager_id: profil.trager_id,
      kampagne_endet_in_tagen: input.kampagneEndetInTagen,
      bewertung_veraltet_nach_tagen: input.bewertungVeraltetNachTagen,
      grenzen: input.grenzen,
      kriterien: input.kriterien,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "trager_id" }
  );
  if (error) return { ok: false, error: "Speichern hat nicht geklappt." };
  revalidatePath("/marketing", "layout");
  return { ok: true };
}
