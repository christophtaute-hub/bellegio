import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { berechneBelegungsVorschau, type VorschauGruppe, type VorschauKind } from "@/lib/belegung/vorschau";
import { berechneWechselVorschlaege, type WechselOhnePlatz, type WechselVorschlag } from "@/lib/belegung/wechsel-vorschlaege";

export type GeplanterWechsel = { kindId: string; nachGruppeId: string; nachGruppeName: string; abDatum: string };

export type WechselDaten = {
  vorschlaege: WechselVorschlag[];
  ohnePlatz: WechselOhnePlatz[];
  geplant: GeplanterWechsel[];
};

/** Alle noch nicht wirksamen Gruppenwechsel (Termin in der Zukunft) der Einrichtung. */
export async function ladeGeplanteWechsel(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  heute: string
): Promise<GeplanterWechsel[]> {
  const { data } = await supabase
    .from("kind_gruppen_historie")
    .select("kind_id, gruppe_id, gueltig_ab, kinder!inner(einrichtung_id, archived_at), gruppen(name)")
    .eq("kinder.einrichtung_id", einrichtungId)
    .is("kinder.archived_at", null)
    .gt("gueltig_ab", heute);
  return (data ?? [])
    .filter((r) => r.gruppe_id)
    .map((r) => ({ kindId: r.kind_id, nachGruppeId: r.gruppe_id as string, nachGruppeName: r.gruppen?.name ?? "", abDatum: r.gueltig_ab }));
}

/** Wechselvorschläge für eine Einrichtung — aus Gruppen, Kindern und den geplanten Wechseln. Die Vorschau (freie Plätze je Monat)
 * wird hier berechnet, wenn der Aufrufer sie nicht schon hat. */
export async function ladeWechselDaten(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  eingabe: { gruppen: VorschauGruppe[]; kinder: VorschauKind[]; startMonat: string; monate: number; heute: string }
): Promise<WechselDaten> {
  const geplant = await ladeGeplanteWechsel(supabase, einrichtungId, eingabe.heute);
  const { zeilen, freiwerdende } = berechneBelegungsVorschau(eingabe.gruppen, eingabe.kinder, eingabe.startMonat, eingabe.monate);
  const { vorschlaege, ohnePlatz } = berechneWechselVorschlaege({
    gruppen: eingabe.gruppen,
    kinder: eingabe.kinder,
    zeilen,
    freiwerdende,
    geplanteWechsel: geplant,
  });
  return { vorschlaege, ohnePlatz, geplant };
}
