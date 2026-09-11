"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";

export type TeamRoleCategory =
  | "fk"
  | "ek"
  | "ak"
  | "nicht_paed"
  | "sprachfoerderung"
  | "hausmeister"
  | "hauswirtschaft";

export type TeamInput = {
  vorname: string;
  nachname: string;
  rolle: string;
  gruppe_id: string | null;
  wochenstunden: number | null;
  role_category: TeamRoleCategory;
  status: "aktiv" | "inaktiv" | "geplant";
  eintritt: string | null;
  austritt: string | null;
};

export async function createTeamMitglied(input: TeamInput) {
  const supabase = await createClient();
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) throw new Error("Keine aktive Einrichtung ausgewählt.");

  const { data: mitglied, error } = await supabase
    .from("team")
    .insert({
      einrichtung_id: einrichtungId,
      vorname: input.vorname,
      nachname: input.nachname,
      rolle: input.rolle,
      gruppe_id: input.gruppe_id,
      wochenstunden: input.wochenstunden,
      role_category: input.role_category,
      fachkraft: input.role_category === "fk",
      status: input.status,
      eintritt: input.eintritt,
      austritt: input.austritt,
    })
    .select("id")
    .single();

  if (error || !mitglied) {
    throw new Error(error?.message ?? "Personal konnte nicht angelegt werden.");
  }

  revalidatePath("/team");
  revalidatePath("/prognose");
  redirect(`/team/${mitglied.id}`);
}

export async function updateTeamMitglied(teamId: string, input: TeamInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team")
    .update({
      vorname: input.vorname,
      nachname: input.nachname,
      rolle: input.rolle,
      gruppe_id: input.gruppe_id,
      wochenstunden: input.wochenstunden,
      role_category: input.role_category,
      fachkraft: input.role_category === "fk",
      status: input.status,
      eintritt: input.eintritt,
      austritt: input.austritt,
    })
    .eq("id", teamId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath(`/team/${teamId}`);
  revalidatePath("/prognose");
  redirect(`/team/${teamId}`);
}
