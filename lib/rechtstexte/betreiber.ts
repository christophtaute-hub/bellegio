import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type BetreiberOeffentlich = {
  firmenname: string | null;
  anschrift: string | null;
  email: string | null;
  telefon: string | null;
  vertretungsberechtigt: string | null;
  registergericht: string | null;
  registernummer: string | null;
  ust_id: string | null;
  inhaltlich_verantwortlich: string | null;
  datenschutz_email: string | null;
  aufsichtsbehoerde: string | null;
  aufbewahrung_anfragen_monate: number;
  rechtstexte_geprueft: boolean;
};

export const LEERER_BETREIBER: BetreiberOeffentlich = {
  firmenname: null,
  anschrift: null,
  email: null,
  telefon: null,
  vertretungsberechtigt: null,
  registergericht: null,
  registernummer: null,
  ust_id: null,
  inhaltlich_verantwortlich: null,
  datenschutz_email: null,
  aufsichtsbehoerde: null,
  aufbewahrung_anfragen_monate: 6,
  rechtstexte_geprueft: false,
};

export async function ladeBetreiberOeffentlich(supabase: SupabaseClient<Database>): Promise<BetreiberOeffentlich> {
  const { data } = await supabase.from("betreiber_oeffentlich").select("*").eq("id", true).maybeSingle();
  if (!data) return LEERER_BETREIBER;
  const { id: _id, updated_at: _aktualisiert, ...rest } = data;
  void _id;
  void _aktualisiert;
  return rest;
}

const leer = (wert: string | null | undefined) => !wert || wert.trim() === "";

/** Pflichtangaben für Impressum und Datenschutzerklärung. Was fehlt, erscheint auf den Seiten sichtbar als Lücke
 * und im Betreiberbereich als Hinweis. */
export function fehlendeAngaben(b: BetreiberOeffentlich): string[] {
  const fehlend: string[] = [];
  if (leer(b.firmenname)) fehlend.push("Firmenname / Name");
  if (leer(b.anschrift)) fehlend.push("Anschrift");
  if (leer(b.email)) fehlend.push("E-Mail-Adresse");
  return fehlend;
}

/** Empfohlene, aber nicht in jedem Fall verpflichtende Angaben (abhängig von Rechtsform). */
export function empfohleneAngaben(b: BetreiberOeffentlich): string[] {
  const fehlend: string[] = [];
  if (leer(b.telefon)) fehlend.push("Telefon");
  if (leer(b.vertretungsberechtigt)) fehlend.push("Vertretungsberechtigte Person(en)");
  if (leer(b.ust_id)) fehlend.push("Umsatzsteuer-ID");
  if (leer(b.aufsichtsbehoerde)) fehlend.push("Zuständige Datenschutz-Aufsichtsbehörde");
  return fehlend;
}

export const ANGABEN_STAND = "20. September 2026";
