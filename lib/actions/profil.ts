"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateEigenenNamen(fullName: string) {
  if (!fullName.trim()) {
    throw new Error("Bitte einen Namen angeben.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { error } = await supabase
    .from("user_profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
