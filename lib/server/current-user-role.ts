import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";

export type UserRole =
  | "traeger_admin"
  | "einrichtungsleitung"
  | "belegung"
  | "personal"
  | "controlling"
  | "mitarbeiter";

export type Bereich = "belegung" | "personal" | "controlling" | "szenario" | "finanzen";
export type Zugriff = "kein_zugriff" | "ansehen" | "bearbeiten";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (profile?.role as UserRole) ?? null;
}

/** Demo-Konto: darf alles ausprobieren, sieht aber keine Abrechnung und ändert weder Passwort noch Zwei-Faktor. */
export async function istDemoNutzer(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("user_profiles").select("ist_demo").eq("id", user.id).single();
  return data?.ist_demo === true;
}

/** Betreiber (Bellegio-Team): eigene Rolle neben user_profiles.role, gesteuert
 * über platform_operators — bewusst nicht Teil der Kunden-Rollen. */
export async function isPlatformOperator(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Effektiver Zugriff des aktuellen Nutzers auf einen Bereich einer
 * Einrichtung. traeger_admin/einrichtungsleitung haben immer "bearbeiten";
 * alle anderen Nutzer werden granular über einrichtung_berechtigungen
 * geprüft (spiegelt app.current_user_zugriff() aus der RLS — die
 * eigentliche Durchsetzung passiert dort, diese Funktion steuert nur, was
 * die UI anzeigt/anbietet).
 */
export async function getZugriff(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  bereich: Bereich
): Promise<Zugriff> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "kein_zugriff";

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "traeger_admin") return "bearbeiten";
  // finanzen bekommt bewusst keinen Blanko-Zugriff für einrichtungsleitung — "Führung sieht
  // mehrere Einrichtungen ohne Finanzsicht" (Milestone 29, Rückfrage d). Ohne diesen Ausschluss
  // würde die UI hier fälschlich etwas anzeigen, das die RLS dahinter (current_user_zugriff)
  // bereits korrekt blockiert.
  if (bereich !== "finanzen" && profile?.role === "einrichtungsleitung") {
    return "bearbeiten";
  }

  const { data } = await supabase
    .from("einrichtung_berechtigungen")
    .select("zugriff")
    .eq("user_id", user.id)
    .eq("einrichtung_id", einrichtungId)
    .eq("bereich", bereich)
    .maybeSingle();

  return (data?.zugriff as Zugriff | undefined) ?? "kein_zugriff";
}

export async function canWriteBelegung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "belegung")) === "bearbeiten";
}

export async function canWritePersonal(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "personal")) === "bearbeiten";
}

export async function canUseSzenarioRechner(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "szenario")) !== "kein_zugriff";
}

export async function canViewControlling(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "controlling")) !== "kein_zugriff";
}

export async function canWriteFinanzen(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "finanzen")) === "bearbeiten";
}

export async function canViewFinanzen(
  supabase: SupabaseClient<Database>,
  einrichtungId: string
): Promise<boolean> {
  return (await getZugriff(supabase, einrichtungId, "finanzen")) !== "kein_zugriff";
}
