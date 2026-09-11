"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";

export type KindInput = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: "maennlich" | "weiblich" | "divers" | "keine_angabe";
  status: "aktiv" | "nachruecker" | "geplant";
  gruppe_id: string | null;
  platznummer: string | null;
  eintritt: string | null;
  austritt: string | null;
  buchungszeit_band_id: string | null;
  notizen: string | null;
  weighting_factor_ids: string[];
};

async function syncWeightingFactors(kindId: string, weightingFactorIds: string[]) {
  const supabase = await createClient();
  await supabase.from("kind_weighting_factors").delete().eq("kind_id", kindId);
  if (weightingFactorIds.length > 0) {
    await supabase.from("kind_weighting_factors").insert(
      weightingFactorIds.map((weighting_factor_id) => ({
        kind_id: kindId,
        weighting_factor_id,
      }))
    );
  }
}

export async function createKind(input: KindInput) {
  const supabase = await createClient();
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) throw new Error("Keine aktive Einrichtung ausgewählt.");

  const { data: kind, error } = await supabase
    .from("kinder")
    .insert({
      einrichtung_id: einrichtungId,
      vorname: input.vorname,
      nachname: input.nachname,
      geburtsdatum: input.geburtsdatum,
      geschlecht: input.geschlecht,
      status: input.status,
      gruppe_id: input.gruppe_id,
      platznummer: input.platznummer,
      eintritt: input.eintritt,
      austritt: input.austritt,
      buchungszeit_band_id: input.buchungszeit_band_id,
      notizen: input.notizen,
    })
    .select("id")
    .single();

  if (error || !kind) {
    throw new Error(error?.message ?? "Kind konnte nicht angelegt werden.");
  }

  await syncWeightingFactors(kind.id, input.weighting_factor_ids);

  revalidatePath("/kinder");
  revalidatePath("/gruppen");
  redirect(`/kinder/${kind.id}`);
}

export async function updateKind(kindId: string, input: KindInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("kinder")
    .update({
      vorname: input.vorname,
      nachname: input.nachname,
      geburtsdatum: input.geburtsdatum,
      geschlecht: input.geschlecht,
      status: input.status,
      gruppe_id: input.gruppe_id,
      platznummer: input.platznummer,
      eintritt: input.eintritt,
      austritt: input.austritt,
      buchungszeit_band_id: input.buchungszeit_band_id,
      notizen: input.notizen,
    })
    .eq("id", kindId);

  if (error) throw new Error(error.message);

  await syncWeightingFactors(kindId, input.weighting_factor_ids);

  revalidatePath("/kinder");
  revalidatePath(`/kinder/${kindId}`);
  revalidatePath("/gruppen");
  redirect(`/kinder/${kindId}`);
}
