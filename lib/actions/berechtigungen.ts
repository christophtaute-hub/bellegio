"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { pruefePasswort } from "@/lib/passwort";
import type { Bereich, Zugriff } from "@/lib/server/current-user-role";

export async function setEinrichtungBerechtigung(
  userId: string,
  einrichtungId: string,
  bereich: Bereich,
  zugriff: Zugriff
) {
  const supabase = await createClient();

  const { error } = await supabase.from("einrichtung_berechtigungen").upsert(
    {
      user_id: userId,
      einrichtung_id: einrichtungId,
      bereich,
      zugriff,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,einrichtung_id,bereich" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/einstellungen");
}

export async function setKannRechteVerwalten(userId: string, value: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_profiles")
    .update({ kann_rechte_verwalten: value })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/einstellungen");
}

export async function inviteUser(email: string, fullName: string, password?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("trager_id, role, kann_rechte_verwalten")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    (profile.role !== "traeger_admin" && !profile.kann_rechte_verwalten)
  ) {
    throw new Error("Keine Berechtigung, Nutzer anzulegen.");
  }

  if (password) {
    const passwortFehler = pruefePasswort(password);
    if (passwortFehler) throw new Error(passwortFehler);
  }

  const adminClient = createServiceRoleClient();

  // Mit Passwort: Account ist sofort einsatzbereit, kein Einladungs-Mail-
  // Umweg. Ohne Passwort: klassische Einladung per E-Mail-Link.
  const { data: created, error: createError } = password
    ? await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
    : await adminClient.auth.admin.inviteUserByEmail(email);

  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Nutzer konnte nicht angelegt werden.");
  }

  const { error: profileError } = await adminClient
    .from("user_profiles")
    .insert({
      id: created.user.id,
      email,
      full_name: fullName || null,
      role: "mitarbeiter",
      trager_id: profile.trager_id,
      kann_rechte_verwalten: false,
    });

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/einstellungen");
}
