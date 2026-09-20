"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import { istBundeslandCode } from "@/lib/admin/neuer-kunde";

export async function setActiveEinrichtung(einrichtungId: string) {
  const supabase = await createClient();

  // Re-validated via RLS: if the user has no access, this returns no row
  // and the cookie is never set. The cookie itself is never trusted as the
  // security boundary — every later query re-checks RLS regardless.
  const { data, error } = await supabase
    .from("einrichtungen")
    .select("id")
    .eq("id", einrichtungId)
    .single();

  if (error || !data) {
    throw new Error("Keine Berechtigung für diese Einrichtung.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_EINRICHTUNG_COOKIE, einrichtungId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}

export async function updateVollzeitWochenstunden(
  einrichtungId: string,
  vollzeitWochenstunden: number
) {
  if (!(vollzeitWochenstunden > 0)) {
    throw new Error("Bitte eine gültige Stundenzahl angeben.");
  }

  const supabase = await createClient();

  // RLS on einrichtungen restricts updates to traeger_admin — a
  // einrichtungsleitung's attempt is rejected here, not just hidden in the UI.
  const { error } = await supabase
    .from("einrichtungen")
    .update({ vollzeit_wochenstunden: vollzeitWochenstunden })
    .eq("id", einrichtungId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/controlling");
  revalidatePath("/szenario");
}

export type EinrichtungGrunddatenInput = {
  name: string;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  kita_year_start_month: number;
  standort_gemeinde: string | null;
  auswaertigen_quote_prozent: number | null;
};

export async function updateEinrichtungGrunddaten(
  einrichtungId: string,
  input: EinrichtungGrunddatenInput
) {
  if (!input.name.trim()) {
    throw new Error("Bitte einen Namen angeben.");
  }
  if (input.kita_year_start_month < 1 || input.kita_year_start_month > 12) {
    throw new Error("Bitte einen gültigen Monat (1–12) angeben.");
  }

  const supabase = await createClient();

  // RLS on einrichtungen restricts updates to traeger_admin — a
  // einrichtungsleitung's attempt is rejected here, not just hidden in the UI.
  const { error } = await supabase
    .from("einrichtungen")
    .update({
      name: input.name.trim(),
      address_street: input.address_street,
      address_city: input.address_city,
      address_zip: input.address_zip,
      kita_year_start_month: input.kita_year_start_month,
      standort_gemeinde: input.standort_gemeinde,
      auswaertigen_quote_prozent: input.auswaertigen_quote_prozent,
    })
    .eq("id", einrichtungId);

  if (error) throw new Error(error.message);

  revalidatePath("/einstellungen");
  revalidatePath("/dashboard");
  revalidatePath("/einrichtung-auswahl");
}

export async function updateEmpfohlenerAnstellungsschluessel(
  einrichtungId: string,
  empfohlenerAnstellungsschluessel: number
) {
  if (!(empfohlenerAnstellungsschluessel > 0)) {
    throw new Error("Bitte einen gültigen Schlüssel angeben.");
  }

  const supabase = await createClient();

  // RLS on einrichtungen restricts updates to traeger_admin — a
  // einrichtungsleitung's attempt is rejected here, not just hidden in the UI.
  const { error } = await supabase
    .from("einrichtungen")
    .update({ empfohlener_anstellungsschluessel: empfohlenerAnstellungsschluessel })
    .eq("id", einrichtungId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/controlling");
  revalidatePath("/szenario");
}

export type EinrichtungErgebnis = { ok: true; id: string } | { ok: false; error: string };

export type NeueEinrichtungInput = {
  name: string;
  bundeslandCode: string;
  ort: string | null;
  vollzeitWochenstunden: number;
};

/** Legt eine weitere Einrichtung im eigenen Träger an. RLS lässt das nur Träger-Admins zu. */
export async function legeEinrichtungAn(input: NeueEinrichtungInput): Promise<EinrichtungErgebnis> {
  if (!input.name.trim()) return { ok: false, error: "Bitte einen Namen angeben." };
  if (!istBundeslandCode(input.bundeslandCode)) return { ok: false, error: "Bitte ein Bundesland auswählen." };
  if (!(input.vollzeitWochenstunden > 0 && input.vollzeitWochenstunden <= 60)) {
    return { ok: false, error: "Bitte eine gültige Vollzeit-Wochenstundenzahl (1–60) angeben." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("user_profiles").select("trager_id, role").eq("id", user.id).single()
    : { data: null };
  if (!profil || profil.role !== "traeger_admin") {
    return { ok: false, error: "Nur die Träger-Administration kann Einrichtungen anlegen." };
  }

  // Die ID wird hier erzeugt und der Insert läuft ohne RETURNING: Die SELECT-Regel
  // (app.user_has_einrichtung_access) sieht die neue Zeile im selben Statement noch nicht,
  // ein `.select()` würde den Insert deshalb an der RLS scheitern lassen.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("einrichtungen").insert({
    id,
    trager_id: profil.trager_id,
    name: input.name.trim(),
    address_city: input.ort?.trim() || null,
    bundesland_code: input.bundeslandCode,
    vollzeit_wochenstunden: input.vollzeitWochenstunden,
  });
  if (error) return { ok: false, error: "Die Einrichtung konnte nicht angelegt werden." };

  revalidatePath("/einrichtung-auswahl");
  revalidatePath("/einstellungen");
  return { ok: true, id };
}

/** Archiviert eine Einrichtung (Daten bleiben erhalten). Die gerade aktive Einrichtung lässt sich nicht archivieren. */
export async function archiviereEinrichtung(einrichtungId: string): Promise<EinrichtungErgebnis> {
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_EINRICHTUNG_COOKIE)?.value === einrichtungId) {
    return { ok: false, error: "Die aktuell geöffnete Einrichtung kann nicht archiviert werden. Wechsle zuerst in eine andere." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("einrichtungen")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", einrichtungId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Die Einrichtung konnte nicht archiviert werden." };

  revalidatePath("/einrichtung-auswahl");
  revalidatePath("/einstellungen");
  return { ok: true, id: data.id };
}
