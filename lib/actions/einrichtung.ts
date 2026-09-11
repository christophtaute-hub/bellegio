"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";

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
}
