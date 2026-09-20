"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import { getMfaStatus } from "@/lib/server/mfa";

export type SignInState = { error: string | null };

export async function signIn(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  // A stale cookie from a previous user's session on this browser must
  // never carry over — it could point at a facility this user has no
  // access to and skip the Einrichtung-Auswahl step entirely.
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_EINRICHTUNG_COOKIE);

  // Wer einen zweiten Faktor eingerichtet hat, bestätigt ihn direkt nach dem Passwort.
  if ((await getMfaStatus()) === "code_erforderlich") redirect("/mfa");

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_EINRICHTUNG_COOKIE);

  redirect("/login");
}
