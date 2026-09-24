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
  revalidatePath("/controlling");
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
  revalidatePath("/controlling");
  redirect(`/team/${teamId}`);
}

export async function updateTeamGruppe(teamId: string, gruppeId: string | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team")
    .update({ gruppe_id: gruppeId })
    .eq("id", teamId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/controlling");
}

export type AusfallzeitArt =
  | "mutterschutz"
  | "schwangerschaft"
  | "krankheit"
  | "sonderurlaub"
  | "sonstiges";

export type AusfallzeitInput = {
  art: AusfallzeitArt;
  von: string;
  bis: string | null;
  notizen: string | null;
};

export async function createAusfallzeit(teamId: string, input: AusfallzeitInput) {
  const supabase = await createClient();

  const { error } = await supabase.from("team_ausfallzeiten").insert({
    team_id: teamId,
    art: input.art,
    von: input.von,
    bis: input.bis,
    notizen: input.notizen,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/team/${teamId}`);
  revalidatePath("/controlling");
}

export async function deleteAusfallzeit(ausfallzeitId: string, teamId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_ausfallzeiten")
    .delete()
    .eq("id", ausfallzeitId);

  if (error) throw new Error(error.message);

  revalidatePath(`/team/${teamId}`);
  revalidatePath("/controlling");
}

/** `wochenstunden = null` löscht den Eintrag wieder — der Monat fällt dadurch zurück auf den
 * Fallback `team.wochenstunden`, den `team_presence_for_month` ohnehin schon anwendet. */
export async function setzeMonatsstunden(teamId: string, month: string, wochenstunden: number | null) {
  const supabase = await createClient();

  if (wochenstunden === null) {
    const { error } = await supabase
      .from("team_monthly_hours")
      .delete()
      .eq("team_id", teamId)
      .eq("month", month);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("team_monthly_hours")
      .upsert({ team_id: teamId, month, wochenstunden }, { onConflict: "team_id,month" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/team");
  revalidatePath("/team/jahresuebersicht");
  revalidatePath("/controlling");
}
