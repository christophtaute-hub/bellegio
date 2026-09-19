"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1, "Bitte gib deinen Namen an.").max(120),
  organisation: z.string().trim().min(1, "Bitte gib deine Einrichtung oder deinen Träger an.").max(160),
  bundesland: z.enum(["by", "bw", "nrw", "andere"]),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  nachricht: z.string().trim().max(2000).optional(),
  // Honeypot: echte Nutzer lassen das für sie unsichtbare Feld leer.
  website: z.string().max(0).optional(),
});

export type DemoAnfrageErgebnis = { ok: true } | { ok: false; fehler: string };

export async function sendeDemoAnfrage(eingabe: unknown): Promise<DemoAnfrageErgebnis> {
  const parsed = schema.safeParse(eingabe);
  if (!parsed.success) {
    // Honeypot getroffen: so tun, als wäre alles gut gegangen.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true };
    return { ok: false, fehler: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = await createClient();
  const { name, organisation, bundesland, email, nachricht } = parsed.data;
  const { error } = await supabase
    .from("demo_anfragen")
    .insert({ name, organisation, bundesland, email, nachricht: nachricht || null });
  if (error) return { ok: false, fehler: "Die Anfrage konnte gerade nicht gesendet werden. Bitte versuche es später erneut." };
  return { ok: true };
}

export async function markiereDemoAnfrage(id: string, status: "neu" | "bearbeitet") {
  const supabase = await createClient();
  const { error } = await supabase.from("demo_anfragen").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
