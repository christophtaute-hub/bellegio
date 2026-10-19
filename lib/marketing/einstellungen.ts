import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { AMPEL_ARTEN, MAX_STUFE, STANDARD_GRENZEN, STANDARD_KRITERIEN, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import { STANDARD_FRISTEN, type Fristen } from "@/lib/marketing/uebersicht";

export type Grenzen = Record<"personalbedarf" | "belegung", [number, number, number]>;

export type MarketingEinstellungen = {
  fristen: Fristen;
  grenzen: Grenzen;
  kriterien: Record<MarketingAmpelArt, string[]>;
};

export const STANDARD_EINSTELLUNGEN: MarketingEinstellungen = {
  fristen: STANDARD_FRISTEN,
  grenzen: { personalbedarf: [...STANDARD_GRENZEN.personalbedarf], belegung: [...STANDARD_GRENZEN.belegung] },
  kriterien: { ...STANDARD_KRITERIEN },
};

const istZahlenTripel = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) && v[0] <= v[1] && v[1] <= v[2];

/** Fügt gespeicherte Werte mit den Standardwerten zusammen; Ungültiges fällt auf den Standard zurück. */
export function mischeEinstellungen(zeile: { kampagne_endet_in_tagen: number; bewertung_veraltet_nach_tagen: number; grenzen: unknown; kriterien: unknown } | null): MarketingEinstellungen {
  if (!zeile) return STANDARD_EINSTELLUNGEN;
  const g = (zeile.grenzen ?? {}) as Record<string, unknown>;
  const k = (zeile.kriterien ?? {}) as Record<string, unknown>;
  const kriterien = { ...STANDARD_KRITERIEN };
  for (const art of AMPEL_ARTEN) {
    const v = k[art];
    if (Array.isArray(v) && v.length === MAX_STUFE[art] + 1 && v.every((t) => typeof t === "string")) kriterien[art] = v as string[];
  }
  return {
    fristen: { kampagneEndetInTagen: zeile.kampagne_endet_in_tagen, bewertungVeraltetNachTagen: zeile.bewertung_veraltet_nach_tagen },
    grenzen: {
      personalbedarf: istZahlenTripel(g.personalbedarf) ? g.personalbedarf : STANDARD_GRENZEN.personalbedarf,
      belegung: istZahlenTripel(g.belegung) ? g.belegung : STANDARD_GRENZEN.belegung,
    },
    kriterien,
  };
}

export async function ladeMarketingEinstellungen(supabase: SupabaseClient<Database>): Promise<MarketingEinstellungen> {
  const { data } = await supabase.from("marketing_einstellungen").select("*").maybeSingle();
  return mischeEinstellungen(data);
}
