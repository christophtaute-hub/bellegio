"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { pruefeNeuenKunden, type NeuerKundeInput } from "@/lib/admin/neuer-kunde";
import { ladeListenpreise, pruefeListenpreise, type ListenpreiseInput } from "@/lib/preise";
import { isPlatformOperator } from "@/lib/server/current-user-role";
import { getMfaStatus } from "@/lib/server/mfa";
import {
  berechneRechnungsvorschlag,
  monatsGrenzen,
  type OperatorKennzahl,
  type PositionInput,
} from "@/lib/admin/abrechnung";

// Jede Action prüft selbst, dass der Aufrufer Betreiber ist; die RLS-Policies
// und RPC-Guards in der Datenbank sind die eigentliche Sperre.
async function betreiberClient() {
  if (!(await isPlatformOperator())) throw new Error("Nur für den Betreiber.");
  if ((await getMfaStatus()) === "code_erforderlich") throw new Error("Bitte bestätige zuerst den Zwei-Faktor-Code.");
  return createClient();
}

export type BetreiberEinstellungenInput = {
  firmenname: string;
  anschrift: string;
  ust_id: string | null;
  steuernummer: string | null;
  iban: string | null;
  bic: string | null;
  bankname: string | null;
  zahlungsziel_tage: number;
  ust_satz: number;
  ust_hinweis: string | null;
  rechnungsnummer_praefix: string;
  fusszeile: string | null;
};

export async function speichereBetreiberEinstellungen(input: BetreiberEinstellungenInput) {
  const supabase = await betreiberClient();
  if (!(input.zahlungsziel_tage >= 0)) throw new Error("Bitte ein gültiges Zahlungsziel angeben.");
  if (!(input.ust_satz >= 0 && input.ust_satz <= 100)) throw new Error("Bitte einen gültigen USt-Satz (0–100 %) angeben.");
  const { error } = await supabase
    .from("betreiber_einstellungen")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/einstellungen");
}

export type TragerAbrechnungInput = {
  rechnungsname: string | null;
  rechnungsanschrift: string | null;
  rechnungs_email: string | null;
  ust_id: string | null;
  preis_grundgebuehr_pro_einrichtung: number | null;
  preis_pro_kind: number | null;
};

export async function speichereTragerAbrechnung(tragerId: string, input: TragerAbrechnungInput) {
  const supabase = await betreiberClient();
  const { error } = await supabase
    .from("trager_abrechnung")
    .upsert({ trager_id: tragerId, ...input, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/kunden");
  revalidatePath("/abrechnung");
}

export async function erstelleRechnungsEntwurf(tragerId: string, monat: string) {
  const supabase = await betreiberClient();
  const { von, bis } = monatsGrenzen(monat);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: einstellungen }, { data: abrechnung }, { data: kennzahlen, error: kennzahlenError }] =
    await Promise.all([
      supabase.from("betreiber_einstellungen").select("ust_satz").eq("id", true).single(),
      supabase.from("trager_abrechnung").select("*").eq("trager_id", tragerId).maybeSingle(),
      supabase.rpc("operator_kennzahlen", { p_stichtag: von }),
    ]);
  if (kennzahlenError) throw new Error(kennzahlenError.message);

  const positionen = berechneRechnungsvorschlag(
    (kennzahlen ?? []).filter((k) => k.trager_id === tragerId) as OperatorKennzahl[],
    {
      grundgebuehr: abrechnung?.preis_grundgebuehr_pro_einrichtung ?? null,
      proKind: abrechnung?.preis_pro_kind ?? null,
    },
    von
  );

  const { data: rechnung, error } = await supabase
    .from("rechnungen")
    .insert({
      trager_id: tragerId,
      leistungszeitraum_von: von,
      leistungszeitraum_bis: bis,
      ust_satz: einstellungen?.ust_satz ?? 19,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !rechnung) throw new Error(error?.message ?? "Rechnung konnte nicht angelegt werden.");

  if (positionen.length > 0) {
    const { error: positionenError } = await supabase.rpc("rechnung_positionen_setzen", {
      p_id: rechnung.id,
      p_positionen: positionen as unknown as Json,
    });
    if (positionenError) {
      // Keinen leeren Entwurf zurücklassen, wenn der Vorschlag nicht geschrieben werden konnte.
      await supabase.from("rechnungen").delete().eq("id", rechnung.id).eq("status", "entwurf");
      throw new Error(positionenError.message);
    }
  }

  revalidatePath("/admin/rechnungen");
  redirect(`/admin/rechnungen/${rechnung.id}`);
}

export type RechnungsEntwurfInput = {
  leistungszeitraum_von: string;
  leistungszeitraum_bis: string;
  ust_satz: number;
  notiz: string | null;
  positionen: PositionInput[];
};

export async function speichereRechnungsEntwurf(id: string, input: RechnungsEntwurfInput) {
  const supabase = await betreiberClient();
  if (input.positionen.some((p) => !p.beschreibung.trim())) {
    throw new Error("Jede Position braucht eine Beschreibung.");
  }
  const { error } = await supabase
    .from("rechnungen")
    .update({
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      ust_satz: input.ust_satz,
      notiz: input.notiz,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: positionenError } = await supabase.rpc("rechnung_positionen_setzen", {
    p_id: id,
    p_positionen: input.positionen as unknown as Json,
  });
  if (positionenError) throw new Error(positionenError.message);

  revalidatePath(`/admin/rechnungen/${id}`);
}

export async function gibRechnungFrei(id: string) {
  const supabase = await betreiberClient();
  const { error } = await supabase.rpc("rechnung_freigeben", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/rechnungen");
  revalidatePath(`/admin/rechnungen/${id}`);
  revalidatePath("/admin/einnahmen");
  revalidatePath("/admin");
}

export async function setzeRechnungBezahlt(id: string, bezahltAm: string) {
  const supabase = await betreiberClient();
  const { error } = await supabase
    .from("rechnungen")
    .update({ status: "bezahlt", bezahlt_am: bezahltAm })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/rechnungen");
  revalidatePath(`/admin/rechnungen/${id}`);
  revalidatePath("/admin/einnahmen");
  revalidatePath("/admin");
}

export async function storniereRechnung(id: string) {
  const supabase = await betreiberClient();
  const { data: gutschriftId, error } = await supabase.rpc("rechnung_stornieren", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/rechnungen");
  revalidatePath("/admin/einnahmen");
  revalidatePath("/admin");
  redirect(`/admin/rechnungen/${gutschriftId}`);
}

export async function loescheRechnungsEntwurf(id: string) {
  const supabase = await betreiberClient();
  const { error } = await supabase.from("rechnungen").delete().eq("id", id).eq("status", "entwurf");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/rechnungen");
  redirect("/admin/rechnungen");
}

export type KundeAnlegenErgebnis = { ok: true; tragerId: string } | { ok: false; error: string };

/** Legt einen neuen Kunden komplett an: Träger, erste Einrichtung, Träger-Administration
 * (Einladung per E-Mail oder sofort nutzbares Passwort) und Rechnungsdaten. Bei einem
 * Fehler mittendrin wird alles bisher Angelegte wieder entfernt. */
export async function legeKundenAn(input: NeuerKundeInput): Promise<KundeAnlegenErgebnis> {
  try {
    await betreiberClient();
  } catch {
    return { ok: false, error: "Nur für den Betreiber." };
  }
  const fehler = pruefeNeuenKunden(input);
  if (fehler) return { ok: false, error: fehler };

  const admin = createServiceRoleClient();
  const email = input.adminEmail.trim().toLowerCase();
  let tragerId: string | null = null;
  let einrichtungId: string | null = null;
  let userId: string | null = null;

  const aufraeumen = async () => {
    if (userId) {
      await admin.from("user_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
    if (einrichtungId) await admin.from("einrichtungen").delete().eq("id", einrichtungId);
    if (tragerId) {
      await admin.from("trager_abrechnung").delete().eq("trager_id", tragerId);
      await admin.from("trager").delete().eq("id", tragerId);
    }
  };

  try {
    const { data: trager, error: tragerError } = await admin
      .from("trager")
      .insert({ name: input.traegerName.trim() })
      .select("id")
      .single();
    if (tragerError || !trager) throw new Error(tragerError?.message ?? "Träger konnte nicht angelegt werden.");
    tragerId = trager.id;

    const { data: einrichtung, error: einrichtungError } = await admin
      .from("einrichtungen")
      .insert({
        trager_id: trager.id,
        name: input.einrichtungName.trim(),
        address_city: input.ort?.trim() || null,
        bundesland_code: input.bundeslandCode,
        vollzeit_wochenstunden: input.vollzeitWochenstunden,
      })
      .select("id")
      .single();
    if (einrichtungError || !einrichtung) {
      throw new Error(einrichtungError?.message ?? "Einrichtung konnte nicht angelegt werden.");
    }
    einrichtungId = einrichtung.id;

    const { data: created, error: userError } = input.adminPasswort
      ? await admin.auth.admin.createUser({ email, password: input.adminPasswort, email_confirm: true })
      : await admin.auth.admin.inviteUserByEmail(email);
    if (userError || !created.user) {
      throw new Error(userError?.message ?? "Der Administrator-Zugang konnte nicht angelegt werden.");
    }
    userId = created.user.id;

    const { error: profilError } = await admin.from("user_profiles").insert({
      id: created.user.id,
      email,
      full_name: input.adminName.trim(),
      role: "traeger_admin",
      trager_id: trager.id,
      kann_rechte_verwalten: true,
    });
    if (profilError) throw new Error(profilError.message);

    // Neue Kunden starten mit den Listenpreisen; individuelle Preise trägt der Betreiber danach ein.
    const liste = await ladeListenpreise(admin);
    const { error: abrechnungError } = await admin.from("trager_abrechnung").upsert({
      trager_id: trager.id,
      rechnungsname: input.traegerName.trim(),
      rechnungsanschrift: input.rechnungsanschrift?.trim() || null,
      rechnungs_email: input.rechnungsEmail?.trim() || email,
      preis_grundgebuehr_pro_einrichtung: liste.grundgebuehr,
      preis_pro_kind: liste.proKind,
    });
    if (abrechnungError) throw new Error(abrechnungError.message);
  } catch (err) {
    await aufraeumen();
    const meldung = err instanceof Error ? err.message : "Kunde konnte nicht angelegt werden.";
    if (/already been registered|already exists/i.test(meldung)) {
      return { ok: false, error: "Diese E-Mail-Adresse ist bereits vergeben." };
    }
    return { ok: false, error: meldung };
  }

  revalidatePath("/admin/kunden");
  revalidatePath("/admin");
  return { ok: true, tragerId: tragerId! };
}

export type ListenpreiseErgebnis = { ok: true } | { ok: false; error: string };

/** Speichert die öffentlichen Listenpreise, die auf der Landingpage stehen. Nur der Betreiber. */
export async function speichereListenpreise(input: ListenpreiseInput): Promise<ListenpreiseErgebnis> {
  let supabase;
  try {
    supabase = await betreiberClient();
  } catch {
    return { ok: false, error: "Nur für den Betreiber." };
  }
  const fehler = pruefeListenpreise(input);
  if (fehler) return { ok: false, error: fehler };

  const { data, error } = await supabase
    .from("listenpreise")
    .update({
      grundgebuehr_pro_einrichtung: input.grundgebuehr,
      preis_pro_kind: input.proKind,
      hinweis: input.hinweis?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Die Preise konnten nicht gespeichert werden." };

  revalidatePath("/");
  revalidatePath("/admin/kunden");
  return { ok: true };
}
