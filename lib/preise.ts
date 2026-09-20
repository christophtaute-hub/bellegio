import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Öffentliche Listenpreise (netto, je Monat). null = noch nicht festgelegt. */
export type Listenpreise = {
  grundgebuehr: number | null;
  proKind: number | null;
  hinweis: string | null;
};

export const KEINE_PREISE: Listenpreise = { grundgebuehr: null, proKind: null, hinweis: null };

export function hatPreise(preise: Listenpreise): boolean {
  return preise.grundgebuehr !== null || preise.proKind !== null;
}

export async function ladeListenpreise(supabase: SupabaseClient<Database>): Promise<Listenpreise> {
  const { data } = await supabase
    .from("listenpreise")
    .select("grundgebuehr_pro_einrichtung, preis_pro_kind, hinweis")
    .eq("id", true)
    .maybeSingle();
  if (!data) return KEINE_PREISE;
  return {
    grundgebuehr: data.grundgebuehr_pro_einrichtung === null ? null : Number(data.grundgebuehr_pro_einrichtung),
    proKind: data.preis_pro_kind === null ? null : Number(data.preis_pro_kind),
    hinweis: data.hinweis,
  };
}

export type Monatspreis = { grundgebuehr: number; kinder: number; summe: number };

/** Monatspreis netto: Grundgebühr je Einrichtung plus Preis je Kind — dieselbe Rechnung wie im Rechnungsvorschlag
 * (`berechneRechnungsvorschlag`), nur ohne Einzelpositionen. Auf Cent gerundet. */
export function berechneMonatspreis(einrichtungen: number, kinder: number, preise: Listenpreise): Monatspreis {
  const grund = Math.round((preise.grundgebuehr ?? 0) * Math.max(0, einrichtungen) * 100) / 100;
  const proKind = Math.round((preise.proKind ?? 0) * Math.max(0, kinder) * 100) / 100;
  return { grundgebuehr: grund, kinder: proKind, summe: Math.round((grund + proKind) * 100) / 100 };
}

export type ListenpreiseInput = {
  grundgebuehr: number | null;
  proKind: number | null;
  hinweis: string | null;
};

/** Deutsche Fehlermeldung oder null. */
export function pruefeListenpreise(input: ListenpreiseInput): string | null {
  for (const [wert, name] of [
    [input.grundgebuehr, "Grundgebühr"],
    [input.proKind, "Preis je Kind"],
  ] as const) {
    if (wert === null) continue;
    if (!Number.isFinite(wert) || wert < 0 || wert > 100000) return `${name}: bitte einen Betrag zwischen 0 und 100.000 € angeben.`;
  }
  if (input.hinweis && input.hinweis.length > 500) return "Der Hinweis darf höchstens 500 Zeichen lang sein.";
  return null;
}
