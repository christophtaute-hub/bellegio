"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { pruefeGruppe, type GruppeInput } from "@/lib/gruppen/optionen";

export type GruppeErgebnis = { ok: true; id: string } | { ok: false; error: string };

function revalidateGruppen() {
  for (const pfad of ["/gruppen", "/dashboard", "/team", "/controlling", "/szenario", "/kinder"]) {
    revalidatePath(pfad);
  }
}

async function ladeBundesland(einrichtungId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  return data?.bundesland_code ?? null;
}

// Das Bundesland kommt aus der Datenbank, nicht vom Client — der Client entscheidet nicht,
// nach welchem Rechenmodell eine Gruppe gepflegt wird. Die Schreibberechtigung setzt RLS durch.
export async function createGruppe(input: GruppeInput): Promise<GruppeErgebnis> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const bundesland = await ladeBundesland(einrichtungId);
  if (!bundesland) return { ok: false, error: "Einrichtung nicht gefunden." };

  const pruefung = pruefeGruppe(input, bundesland);
  if (pruefung.fehler !== null) return { ok: false, error: pruefung.fehler };

  const supabase = await createClient();
  const { data: letzte } = await supabase
    .from("gruppen")
    .select("sort_order")
    .eq("einrichtung_id", einrichtungId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("gruppen")
    .insert({ ...pruefung.felder, einrichtung_id: einrichtungId, sort_order: (letzte?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "Die Gruppe konnte nicht angelegt werden. Fehlt dir die Berechtigung für die Belegung?" };
  }

  revalidateGruppen();
  return { ok: true, id: data.id };
}

export async function updateGruppe(gruppeId: string, input: GruppeInput): Promise<GruppeErgebnis> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const bundesland = await ladeBundesland(einrichtungId);
  if (!bundesland) return { ok: false, error: "Einrichtung nicht gefunden." };

  const pruefung = pruefeGruppe(input, bundesland);
  if (pruefung.fehler !== null) return { ok: false, error: pruefung.fehler };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gruppen")
    .update(pruefung.felder)
    .eq("id", gruppeId)
    .eq("einrichtung_id", einrichtungId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Die Gruppe konnte nicht gespeichert werden. Fehlt dir die Berechtigung für die Belegung?" };
  }

  revalidateGruppen();
  revalidatePath(`/gruppen/${gruppeId}`);
  return { ok: true, id: data.id };
}

/** Archiviert eine Gruppe — nur wenn niemand mehr in ihr eingeplant ist. Historische Daten bleiben erhalten. */
export async function archiviereGruppe(gruppeId: string): Promise<GruppeErgebnis> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };

  const supabase = await createClient();
  const [{ count: kinder }, { count: team }] = await Promise.all([
    supabase
      .from("kinder")
      .select("id", { count: "exact", head: true })
      .eq("gruppe_id", gruppeId)
      .is("archived_at", null),
    supabase
      .from("team")
      .select("id", { count: "exact", head: true })
      .eq("gruppe_id", gruppeId)
      .is("archived_at", null),
  ]);
  if ((kinder ?? 0) > 0 || (team ?? 0) > 0) {
    return {
      ok: false,
      error: `In dieser Gruppe sind noch ${kinder ?? 0} Kinder und ${team ?? 0} Teammitglieder eingeplant. Bitte zuerst in eine andere Gruppe verschieben.`,
    };
  }

  const { data, error } = await supabase
    .from("gruppen")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", gruppeId)
    .eq("einrichtung_id", einrichtungId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Die Gruppe konnte nicht archiviert werden." };

  revalidateGruppen();
  return { ok: true, id: data.id };
}
