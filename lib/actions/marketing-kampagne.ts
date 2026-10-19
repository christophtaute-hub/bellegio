"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { parseLinks, type KampagneArt, type KampagneKanal, type KampagneStatus } from "@/lib/marketing/kampagne";
import type { MarketingAktionErgebnis } from "@/lib/actions/marketing-bewertung";

export type KampagneInput = {
  id?: string;
  einrichtungId: string;
  art: KampagneArt;
  kanal: KampagneKanal;
  beworbenes: string;
  anzahl: number | null;
  beginn: string | null;
  ende: string | null;
  status: KampagneStatus;
  budget: number | null;
  kosten: number | null;
  linksText: string;
  verantwortlichUserId: string | null;
  kommentar: string;
  naechsterSchritt: string;
  schrittFaellig: string | null;
};

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Legt eine Kampagne an oder ändert sie. Reine Dokumentation — es werden keine Anzeigen geschaltet. Nur mit Marketing-Recht
 * „bearbeiten“ (zusätzlich durch die Datenbank erzwungen); kein Löschen, stattdessen Status „Beendet“. */
export async function speichereKampagne(input: KampagneInput): Promise<MarketingAktionErgebnis> {
  if ((await getMarketingZugriff()) !== "bearbeiten") return { ok: false, error: "Dafür fehlt dir das Recht." };
  const beworbenes = input.beworbenes.trim();
  if (!beworbenes) return { ok: false, error: "Bitte angeben, was beworben wird (Stelle oder Plätze)." };
  if (beworbenes.length > 200) return { ok: false, error: "Die Beschreibung ist zu lang." };
  if (!["personal", "belegung"].includes(input.art) || !["meta", "google", "sonstige"].includes(input.kanal) || !["geplant", "aktiv", "pausiert", "beendet"].includes(input.status)) {
    return { ok: false, error: "Ungültige Auswahl." };
  }
  for (const d of [input.beginn, input.ende, input.schrittFaellig]) if (d !== null && !DATUM.test(d)) return { ok: false, error: "Ungültiges Datum." };
  if (input.beginn && input.ende && input.ende < input.beginn) return { ok: false, error: "Das Ende liegt vor dem Beginn." };
  for (const n of [input.anzahl, input.budget, input.kosten]) if (n !== null && !(n >= 0)) return { ok: false, error: "Zahlen dürfen nicht negativ sein." };
  const { links, ungueltig } = parseLinks(input.linksText);
  if (ungueltig.length > 0) return { ok: false, error: `Kein gültiger Link (http/https): ${ungueltig[0]}` };
  if (input.kommentar.length > 2000 || input.naechsterSchritt.length > 500) return { ok: false, error: "Ein Text ist zu lang." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const werte = {
    einrichtung_id: input.einrichtungId,
    art: input.art,
    kanal: input.kanal,
    beworbenes,
    anzahl: input.anzahl,
    beginn: input.beginn,
    ende: input.ende,
    status: input.status,
    budget: input.budget,
    kosten: input.kosten,
    links,
    verantwortlich_user_id: input.verantwortlichUserId,
    kommentar: input.kommentar.trim() || null,
    naechster_schritt: input.naechsterSchritt.trim() || null,
    schritt_faellig: input.schrittFaellig,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from("marketing_kampagne").update(werte).eq("id", input.id).eq("einrichtung_id", input.einrichtungId)
    : await supabase.from("marketing_kampagne").insert({ ...werte, created_by: user.id });
  if (error) return { ok: false, error: "Speichern hat nicht geklappt." };
  revalidatePath("/marketing");
  revalidatePath("/marketing/kampagnen");
  revalidatePath(`/marketing/einrichtungen/${input.einrichtungId}`);
  return { ok: true };
}
