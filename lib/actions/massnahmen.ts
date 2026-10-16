"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWriteBelegung, canWritePersonal } from "@/lib/server/current-user-role";
import type { Massnahme, MassnahmenBereich } from "@/lib/steuerung/massnahmen";

type Ergebnis<T = undefined> = { ok: true; daten: T } | { ok: false; fehler: string };

async function darfSchreiben(einrichtungId: string, bereich: MassnahmenBereich): Promise<boolean> {
  const supabase = await createClient();
  return bereich === "belegung" ? canWriteBelegung(supabase, einrichtungId) : canWritePersonal(supabase, einrichtungId);
}

export async function ladeMassnahmen(einrichtungId: string, bereich: MassnahmenBereich): Promise<Massnahme[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("massnahmen")
    .select("id, bereich, typ, titel, notiz, ziel_monat, status, created_at, erledigt_am, ersteller:user_profiles!massnahmen_created_by_fkey(full_name), erledigt:user_profiles!massnahmen_erledigt_von_fkey(full_name)")
    .eq("einrichtung_id", einrichtungId)
    .eq("bereich", bereich)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((m) => ({
    id: m.id,
    bereich: m.bereich as MassnahmenBereich,
    typ: m.typ,
    titel: m.titel,
    notiz: m.notiz,
    zielMonat: m.ziel_monat,
    status: m.status as "offen" | "erledigt",
    erstelltVon: (m.ersteller as { full_name: string | null } | null)?.full_name ?? null,
    erstelltAm: m.created_at,
    erledigtVon: (m.erledigt as { full_name: string | null } | null)?.full_name ?? null,
    erledigtAm: m.erledigt_am,
  }));
}

export async function legeMassnahmeAn(input: {
  einrichtungId: string;
  bereich: MassnahmenBereich;
  typ: string;
  titel: string;
  notiz: string;
  zielMonat: string | null;
}): Promise<Ergebnis> {
  const titel = input.titel.trim();
  if (!titel) return { ok: false, fehler: "Bitte eine Maßnahme wählen oder benennen." };
  if (titel.length > 200 || input.notiz.length > 2000) return { ok: false, fehler: "Der Text ist zu lang." };
  if (!(await darfSchreiben(input.einrichtungId, input.bereich))) return { ok: false, fehler: "Dafür fehlt dir das Recht." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, fehler: "Nicht angemeldet." };
  const { error } = await supabase.from("massnahmen").insert({
    einrichtung_id: input.einrichtungId,
    bereich: input.bereich,
    typ: input.typ,
    titel,
    notiz: input.notiz.trim() || null,
    ziel_monat: input.zielMonat,
    created_by: user.id,
  });
  if (error) return { ok: false, fehler: "Speichern hat nicht geklappt." };
  revalidatePath("/einrichtung-auswahl");
  revalidatePath("/dashboard");
  return { ok: true, daten: undefined };
}

export async function schliesseMassnahmeAb(einrichtungId: string, bereich: MassnahmenBereich, id: string): Promise<Ergebnis> {
  if (!(await darfSchreiben(einrichtungId, bereich))) return { ok: false, fehler: "Dafür fehlt dir das Recht." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, fehler: "Nicht angemeldet." };
  const { error } = await supabase
    .from("massnahmen")
    .update({ status: "erledigt", erledigt_von: user.id, erledigt_am: new Date().toISOString() })
    .eq("id", id)
    .eq("einrichtung_id", einrichtungId);
  if (error) return { ok: false, fehler: "Speichern hat nicht geklappt." };
  revalidatePath("/einrichtung-auswahl");
  revalidatePath("/dashboard");
  return { ok: true, daten: undefined };
}

/** Kann der aktuelle Nutzer Maßnahmen für diese Einrichtung anlegen? (steuert die Anzeige im Dialog) */
export async function darfMassnahmenSchreiben(einrichtungId: string): Promise<{ belegung: boolean; personal: boolean }> {
  return { belegung: await darfSchreiben(einrichtungId, "belegung"), personal: await darfSchreiben(einrichtungId, "personal") };
}
