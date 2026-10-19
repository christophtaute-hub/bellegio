import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Kampagne, KampagneArt, KampagneKanal, KampagneStatus } from "@/lib/marketing/kampagne";

type Row = Database["public"]["Tables"]["marketing_kampagne"]["Row"];

export function zuKampagne(r: Row): Kampagne {
  return {
    id: r.id,
    einrichtungId: r.einrichtung_id,
    art: r.art as KampagneArt,
    kanal: r.kanal as KampagneKanal,
    beworbenes: r.beworbenes,
    anzahl: r.anzahl,
    beginn: r.beginn,
    ende: r.ende,
    status: r.status as KampagneStatus,
    budget: r.budget === null ? null : Number(r.budget),
    kosten: r.kosten === null ? null : Number(r.kosten),
    links: r.links ?? [],
    verantwortlichUserId: r.verantwortlich_user_id,
    kommentar: r.kommentar,
    naechsterSchritt: r.naechster_schritt,
    schrittFaellig: r.schritt_faellig,
  };
}

/** Alle Kampagnen (optional einer Einrichtung), laufende zuerst. */
export async function ladeKampagnen(supabase: SupabaseClient<Database>, einrichtungId?: string): Promise<Kampagne[]> {
  let q = supabase.from("marketing_kampagne").select("*").order("created_at", { ascending: false }).limit(1000);
  if (einrichtungId) q = q.eq("einrichtung_id", einrichtungId);
  const { data } = await q;
  const reihenfolge: Record<string, number> = { aktiv: 0, geplant: 1, pausiert: 2, beendet: 3 };
  return (data ?? []).map(zuKampagne).sort((a, b) => reihenfolge[a.status] - reihenfolge[b.status]);
}
