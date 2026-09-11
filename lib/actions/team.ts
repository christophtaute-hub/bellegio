"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";

export type TeamInput = {
  vorname: string;
  nachname: string;
  rolle: string;
  gruppe_id: string | null;
  wochenstunden: number | null;
  fachkraft: boolean;
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
      fachkraft: input.fachkraft,
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
      fachkraft: input.fachkraft,
      status: input.status,
      eintritt: input.eintritt,
      austritt: input.austritt,
    })
    .eq("id", teamId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath(`/team/${teamId}`);
  redirect(`/team/${teamId}`);
}
