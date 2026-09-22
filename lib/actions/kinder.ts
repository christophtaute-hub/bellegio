"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { sollHistorieGeschriebenWerden } from "@/lib/kinder/buchungszeit-historie";

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
  vertrag_gueltig_bis: string | null;
  buchungszeit_band_id: string | null;
  /** Ab wann die Buchungszeit gilt — schreibt einen Historie-Eintrag, wenn sich das Band ändert. */
  buchungszeit_wirksam_ab: string | null;
  wohnort: string | null;
  notizen: string | null;
  hat_behinderung: boolean;
  weighting_factor_ids: string[];
};

const GESCHLECHT_WERTE = ["maennlich", "weiblich", "divers", "keine_angabe"];

// Gleiche Regeln wie im Formular — gelten auch, wenn die Action ohne Browser aufgerufen wird.
function validateKindInput(input: KindInput) {
  if (!GESCHLECHT_WERTE.includes(input.geschlecht)) {
    throw new Error("Bitte ein Geschlecht auswählen.");
  }
  if (input.status === "nachruecker" && !input.eintritt) {
    throw new Error("Nachrücker brauchen ein geplantes Eintrittsdatum.");
  }
  // Ohne Eintritt zählt ein aktives Kind in keiner Belegungs- oder Personalberechnung.
  if (input.status === "aktiv" && !input.eintritt) {
    throw new Error("Aktive Kinder brauchen ein Eintrittsdatum.");
  }
}

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

/** Schreibt einen Buchungszeit-Historie-Eintrag, wenn sich das Band ändert — Stichtags-Auswertungen der
 * Vergangenheit bleiben dadurch bei der damals gültigen Buchungszeit (siehe `kinder_presence_at_date`). */
async function schreibeBuchungszeitHistorie(
  kindId: string,
  altesBand: string | null,
  neuesBand: string | null,
  wirksamAb: string | null
) {
  if (!sollHistorieGeschriebenWerden(altesBand, neuesBand)) return;
  const gueltigAb = wirksamAb || toIsoDateString(new Date());
  const supabase = await createClient();
  const { error } = await supabase
    .from("kind_buchungszeit_historie")
    .upsert(
      { kind_id: kindId, buchungszeit_band_id: neuesBand, gueltig_ab: gueltigAb },
      { onConflict: "kind_id,gueltig_ab" }
    );
  // Ein fehlgeschlagener Historie-Eintrag darf das Speichern des Kindes nicht verhindern — nur protokollieren.
  if (error) console.error("Buchungszeit-Historie konnte nicht geschrieben werden:", error.message);
}

export async function createKind(input: KindInput) {
  validateKindInput(input);
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
      vertrag_gueltig_bis: input.vertrag_gueltig_bis,
      buchungszeit_band_id: input.buchungszeit_band_id,
      wohnort: input.wohnort,
      notizen: input.notizen,
      hat_behinderung: input.hat_behinderung,
    })
    .select("id")
    .single();

  if (error || !kind) {
    throw new Error(error?.message ?? "Kind konnte nicht angelegt werden.");
  }

  await syncWeightingFactors(kind.id, input.weighting_factor_ids);
  await schreibeBuchungszeitHistorie(
    kind.id,
    null,
    input.buchungszeit_band_id,
    input.buchungszeit_wirksam_ab || input.eintritt
  );

  revalidatePath("/kinder");
  revalidatePath("/gruppen");
  redirect(`/kinder/${kind.id}`);
}

export async function updateKind(kindId: string, input: KindInput) {
  validateKindInput(input);
  const supabase = await createClient();

  const { data: bisher } = await supabase
    .from("kinder")
    .select("buchungszeit_band_id")
    .eq("id", kindId)
    .single();

  const heute = toIsoDateString(new Date());
  const wirdRueckwirkendOderHeuteWirksam = !input.buchungszeit_wirksam_ab || input.buchungszeit_wirksam_ab <= heute;

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
      vertrag_gueltig_bis: input.vertrag_gueltig_bis,
      // Ein Wechsel, der erst in der Zukunft wirksam wird, ändert den "aktuellen" Wert noch nicht — der gilt ja
      // erst ab dem gewählten Datum. Für Stichtags-Auswertungen ist das ohnehin egal, die lösen über die Historie auf.
      ...(wirdRueckwirkendOderHeuteWirksam ? { buchungszeit_band_id: input.buchungszeit_band_id } : {}),
      wohnort: input.wohnort,
      notizen: input.notizen,
      hat_behinderung: input.hat_behinderung,
    })
    .eq("id", kindId);

  if (error) throw new Error(error.message);

  await syncWeightingFactors(kindId, input.weighting_factor_ids);
  await schreibeBuchungszeitHistorie(
    kindId,
    bisher?.buchungszeit_band_id ?? null,
    input.buchungszeit_band_id,
    input.buchungszeit_wirksam_ab
  );

  revalidatePath("/kinder");
  revalidatePath(`/kinder/${kindId}`);
  revalidatePath("/gruppen");
  redirect(`/kinder/${kindId}`);
}
