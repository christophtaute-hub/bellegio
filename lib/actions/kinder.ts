"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { sollHistorieGeschriebenWerden } from "@/lib/kinder/buchungszeit-historie";
import { schreibeGruppenHistorie, FRUEHESTES_DATUM } from "@/lib/kinder/gruppen-historie";

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
  /** Gültigkeitszeitraum des I-Status (nur bei hat_behinderung); leer = unbefristet bzw. ohne Beginn. */
  i_status_von: string | null;
  i_status_bis: string | null;
  /** Kooperation (Ja/Nein) — nur in Baden-Württemberg im Formular. */
  kooperation: boolean;
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
  // Gespiegelt in der DB-Constraint kinder_aktiv_requires_austritt — hier zusätzlich geprüft, damit
  // eine fehlende Angabe als verständliche deutsche Meldung statt eines rohen Constraint-Fehlers ankommt.
  // Seit Milestone 31 auch für Nachrücker (Rückmeldung von Christoph).
  if ((input.status === "aktiv" || input.status === "nachruecker") && !input.austritt) {
    throw new Error(
      input.status === "aktiv"
        ? "Aktive Kinder brauchen ein Austrittsdatum."
        : "Nachrücker brauchen ein Austrittsdatum."
    );
  }
  if (input.hat_behinderung && input.i_status_von && input.i_status_bis && input.i_status_bis < input.i_status_von) {
    throw new Error("Beim I-Status muss „gültig bis“ nach „gültig von“ liegen.");
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
      i_status_von: input.hat_behinderung ? input.i_status_von : null,
      i_status_bis: input.hat_behinderung ? input.i_status_bis : null,
      kooperation: input.kooperation,
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
  if (input.gruppe_id) {
    await supabase
      .from("kind_gruppen_historie")
      .upsert({ kind_id: kind.id, gruppe_id: input.gruppe_id, gueltig_ab: input.eintritt || FRUEHESTES_DATUM }, { onConflict: "kind_id,gueltig_ab" });
  }

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
    .select("buchungszeit_band_id, gruppe_id, eintritt")
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
      i_status_von: input.hat_behinderung ? input.i_status_von : null,
      i_status_bis: input.hat_behinderung ? input.i_status_bis : null,
      kooperation: input.kooperation,
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
  await schreibeGruppenHistorie(supabase, kindId, bisher?.gruppe_id ?? null, input.gruppe_id, {
    eintritt: bisher?.eintritt ?? input.eintritt,
    heute,
  });

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

export type NachfolgeErgebnis = { ok: true } | { ok: false; error: string };

/** Ordnet einem austretenden Kind einen Nachfolger zu („Kind B rückt für Kind A nach“). Der Nachrücker übernimmt die Gruppe des
 * austretenden Kindes; hat er noch keinen Eintritt, wird der Tag nach dem Austritt vorgeschlagen. Pro austretendem Kind gibt es
 * genau einen Nachfolger — eine frühere Zuordnung wird ersetzt. `nachfolgerId = null` löst die Zuordnung. RLS prüft das Recht
 * (Bereich Belegung, bearbeiten); die Fachprüfungen stehen hier, damit eine verständliche Meldung statt eines Fehlers ankommt. */
export async function ordneNachfolgerZu(austretendId: string, nachfolgerId: string | null): Promise<NachfolgeErgebnis> {
  const supabase = await createClient();
  const einrichtungId = await getActiveEinrichtungId();

  const { data: austretend } = await supabase
    .from("kinder")
    .select("id, einrichtung_id, status, gruppe_id, austritt")
    .eq("id", austretendId)
    .maybeSingle();
  if (!austretend || austretend.einrichtung_id !== einrichtungId) return { ok: false, error: "Das Kind wurde nicht gefunden." };
  if (austretend.status !== "aktiv") return { ok: false, error: "Nur ein aktives Kind kann einen Nachfolger bekommen." };

  // Bisherige Zuordnung zu diesem Kind lösen (ein Nachfolger je Platz).
  const { error: loeseFehler } = await supabase.from("kinder").update({ ersetzt_kind_id: null }).eq("ersetzt_kind_id", austretendId);
  if (loeseFehler) return { ok: false, error: "Die Zuordnung konnte nicht gespeichert werden." };

  if (nachfolgerId) {
    const { data: nachfolger } = await supabase
      .from("kinder")
      .select("id, einrichtung_id, status, eintritt, gruppe_id")
      .eq("id", nachfolgerId)
      .maybeSingle();
    if (!nachfolger || nachfolger.einrichtung_id !== einrichtungId) return { ok: false, error: "Der Nachrücker wurde nicht gefunden." };
    if (nachfolger.status !== "nachruecker" && nachfolger.status !== "geplant") {
      return { ok: false, error: "Als Nachfolger kommt nur ein Nachrücker oder geplantes Kind in Frage." };
    }
    const update: { ersetzt_kind_id: string; gruppe_id: string | null; eintritt?: string } = {
      ersetzt_kind_id: austretendId,
      gruppe_id: austretend.gruppe_id,
    };
    if (!nachfolger.eintritt && austretend.austritt) {
      const tag = new Date(`${austretend.austritt}T00:00:00Z`);
      tag.setUTCDate(tag.getUTCDate() + 1);
      update.eintritt = toIsoDateString(tag);
    }
    const { error } = await supabase.from("kinder").update(update).eq("id", nachfolgerId);
    if (error) return { ok: false, error: "Die Zuordnung konnte nicht gespeichert werden." };
    await schreibeGruppenHistorie(supabase, nachfolgerId, nachfolger.gruppe_id, austretend.gruppe_id, {
      eintritt: update.eintritt ?? nachfolger.eintritt,
      heute: toIsoDateString(new Date()),
      geplanteLoeschen: false,
    });
  }

  revalidatePath("/gruppen");
  revalidatePath("/dashboard");
  revalidatePath(`/kinder/${austretendId}`);
  if (nachfolgerId) revalidatePath(`/kinder/${nachfolgerId}`);
  return { ok: true };
}

export type WechselErgebnis = { ok: true } | { ok: false; error: string };

/** Plant den Wechsel eines Kindes in eine andere Gruppe (z. B. Krippe → Kindergarten) zum Monatsersten `abDatum`. Belegung,
 * Forecast und Gruppen-Ampel rechnen ab dem Termin mit der neuen Gruppe (Gruppenhistorie). Optional wird das Austrittsdatum auf
 * das Kindergartenende (Einschulung) gesetzt — bei Krippenkindern steht dort sonst der 3. Geburtstag. Liegt der Termin heute oder
 * in der Vergangenheit, wirkt der Wechsel sofort. Ein früher geplanter, noch nicht wirksamer Wechsel wird ersetzt. */
export async function planeGruppenwechsel(
  kindId: string,
  nachGruppeId: string,
  abDatum: string,
  neuerAustritt: string | null
): Promise<WechselErgebnis> {
  if (!/^\d{4}-\d{2}-01$/.test(abDatum)) return { ok: false, error: "Der Wechsel gilt ab einem Monatsersten." };
  if (neuerAustritt && (!/^\d{4}-\d{2}-\d{2}$/.test(neuerAustritt) || neuerAustritt <= abDatum)) {
    return { ok: false, error: "Das neue Austrittsdatum muss nach dem Wechsel liegen." };
  }
  const supabase = await createClient();
  const einrichtungId = await getActiveEinrichtungId();
  const heute = toIsoDateString(new Date());

  const { data: kind } = await supabase
    .from("kinder")
    .select("id, einrichtung_id, status, gruppe_id, eintritt")
    .eq("id", kindId)
    .maybeSingle();
  if (!kind || kind.einrichtung_id !== einrichtungId) return { ok: false, error: "Das Kind wurde nicht gefunden." };
  if (kind.status !== "aktiv") return { ok: false, error: "Nur ein aktives Kind kann die Gruppe wechseln." };
  if (kind.gruppe_id === nachGruppeId) return { ok: false, error: "Das Kind ist bereits in dieser Gruppe." };

  const { data: ziel } = await supabase.from("gruppen").select("id, einrichtung_id").eq("id", nachGruppeId).maybeSingle();
  if (!ziel || ziel.einrichtung_id !== einrichtungId) return { ok: false, error: "Die Zielgruppe wurde nicht gefunden." };

  await schreibeGruppenHistorie(supabase, kindId, kind.gruppe_id, nachGruppeId, {
    eintritt: kind.eintritt,
    heute,
    wirksamAb: abDatum,
  });

  const update: { gruppe_id?: string; austritt?: string } = {};
  if (abDatum <= heute) update.gruppe_id = nachGruppeId;
  if (neuerAustritt) update.austritt = neuerAustritt;
  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("kinder").update(update).eq("id", kindId);
    if (error) return { ok: false, error: "Der Wechsel konnte nicht gespeichert werden." };
  }

  revalidatePath("/gruppen");
  revalidatePath("/dashboard");
  revalidatePath("/kinder");
  revalidatePath(`/kinder/${kindId}`);
  return { ok: true };
}

/** Nimmt einen noch nicht wirksamen Wechsel zurück. Ein bereits geändertes Austrittsdatum bleibt bestehen (bitte am Kind prüfen). */
export async function nimmGruppenwechselZurueck(kindId: string): Promise<WechselErgebnis> {
  const supabase = await createClient();
  const einrichtungId = await getActiveEinrichtungId();
  const { data: kind } = await supabase.from("kinder").select("id, einrichtung_id").eq("id", kindId).maybeSingle();
  if (!kind || kind.einrichtung_id !== einrichtungId) return { ok: false, error: "Das Kind wurde nicht gefunden." };

  const { error } = await supabase.from("kind_gruppen_historie").delete().eq("kind_id", kindId).gt("gueltig_ab", toIsoDateString(new Date()));
  if (error) return { ok: false, error: "Der Wechsel konnte nicht zurückgenommen werden." };

  revalidatePath("/gruppen");
  revalidatePath("/dashboard");
  revalidatePath(`/kinder/${kindId}`);
  return { ok: true };
}
