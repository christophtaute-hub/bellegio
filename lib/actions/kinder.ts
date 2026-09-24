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
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  buchungszeit_band_id: string | null;
  /** Ab wann die Buchungszeit gilt — schreibt einen Historie-Eintrag, wenn sich das Band ändert. */
  buchungszeit_wirksam_ab: string | null;
  wohnort: string | null;
  hat_behinderung: boolean;
  weighting_factor_ids: string[];
  /** Nur bei Nachrückern: das aktive Kind derselben Gruppe, dessen Platz übernommen wird (optional). */
  ersetzt_kind_id: string | null;
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
  if (input.ersetzt_kind_id && input.status !== "nachruecker") {
    throw new Error("Nur Nachrücker können ein Kind ersetzen.");
  }
}

/** Prüft, dass das referenzierte Kind ein aktives Kind derselben Gruppe ist — sonst eine deutsche Fehlermeldung
 * statt eines stillen Nichts-Tuns oder eines irreführenden Platzbezugs. */
async function pruefeErsetztKindId(
  ersetztKindId: string | null,
  gruppeId: string | null
): Promise<string | null> {
  if (!ersetztKindId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("kinder")
    .select("id, status, gruppe_id")
    .eq("id", ersetztKindId)
    .maybeSingle();
  if (!data || data.status !== "aktiv" || data.gruppe_id !== gruppeId) {
    return "Das ausgewählte Kind ist kein aktives Kind derselben Gruppe.";
  }
  return null;
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
  const ersetztFehler = await pruefeErsetztKindId(input.ersetzt_kind_id, input.gruppe_id);
  if (ersetztFehler) throw new Error(ersetztFehler);
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
      eintritt: input.eintritt,
      austritt: input.austritt,
      vertrag_gueltig_bis: input.vertrag_gueltig_bis,
      buchungszeit_band_id: input.buchungszeit_band_id,
      wohnort: input.wohnort,
      hat_behinderung: input.hat_behinderung,
      ersetzt_kind_id: input.ersetzt_kind_id,
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
  redirect(`/kinder/${kind.id}?gespeichert=1`);
}

export async function updateKind(kindId: string, input: KindInput) {
  validateKindInput(input);
  const ersetztFehler = await pruefeErsetztKindId(input.ersetzt_kind_id, input.gruppe_id);
  if (ersetztFehler) throw new Error(ersetztFehler);
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
      eintritt: input.eintritt,
      austritt: input.austritt,
      vertrag_gueltig_bis: input.vertrag_gueltig_bis,
      // Ein Wechsel, der erst in der Zukunft wirksam wird, ändert den "aktuellen" Wert noch nicht — der gilt ja
      // erst ab dem gewählten Datum. Für Stichtags-Auswertungen ist das ohnehin egal, die lösen über die Historie auf.
      ...(wirdRueckwirkendOderHeuteWirksam ? { buchungszeit_band_id: input.buchungszeit_band_id } : {}),
      wohnort: input.wohnort,
      hat_behinderung: input.hat_behinderung,
      ersetzt_kind_id: input.ersetzt_kind_id,
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
  redirect(`/kinder/${kindId}?gespeichert=1`);
}

/** Fügt dem historischen Notizen-Verlauf eines Kindes einen neuen, datierten Eintrag hinzu — ersetzt das frühere,
 * überschreibbare `kinder.notizen`-Feld. Kein Update/Löschen bestehender Einträge (Audit-Charakter), eine echte
 * Korrektur macht die Träger-Administration nötigenfalls per SQL. */
export async function fuegeNotizHinzu(kindId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const bereinigt = text.trim();
  if (!bereinigt) return { ok: false, error: "Bitte einen Text eingeben." };
  if (bereinigt.length > 2000) return { ok: false, error: "Bitte höchstens 2000 Zeichen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("kind_notizen_verlauf").insert({
    kind_id: kindId,
    text: bereinigt,
    erstellt_von: user?.id ?? null,
  });
  if (error) return { ok: false, error: "Die Notiz konnte nicht gespeichert werden." };

  revalidatePath(`/kinder/${kindId}`);
  revalidatePath("/gruppen");
  return { ok: true };
}
