"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Bewusst getrennt von lib/actions/team.ts: team_verguetung hat eine eigene RLS-Gate
 * (canWriteFinanzen statt canWritePersonal) — ein Personal-only-Formular-Submit soll diese Tabelle
 * nie berühren. Siehe Migration 20260925092000 für die Begründung, warum Gehaltsdaten nicht als
 * Spalten auf team liegen. */
export type TeamVerguetungInput = {
  entgeltgruppe: string | null;
  stufe: number | null;
  monatsgehaltManuell: number | null;
};

export async function upsertTeamVerguetung(teamId: string, einrichtungId: string, input: TeamVerguetungInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_verguetung").upsert(
    {
      team_id: teamId,
      einrichtung_id: einrichtungId,
      entgeltgruppe: input.entgeltgruppe,
      stufe: input.stufe,
      monatsgehalt_manuell: input.monatsgehaltManuell,
    },
    { onConflict: "team_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/team/${teamId}`);
  revalidatePath("/controlling");
}
