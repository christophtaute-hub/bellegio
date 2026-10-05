import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PresenceRow } from "@/lib/dashboard/presence";

export type BeitragZeile = { bandId: string; betrag: number; gueltigAb: string };

/** Alle Preislisten-Zeilen einer Einrichtung (alle Fassungen). Braucht das Recht „Finanzübersicht“. */
export async function ladeBeitragszeilen(supabase: SupabaseClient<Database>, einrichtungId: string): Promise<BeitragZeile[]> {
  const { data } = await supabase
    .from("einrichtung_beitraege")
    .select("booking_time_band_id, betrag_monat, gueltig_ab")
    .eq("einrichtung_id", einrichtungId);
  return (data ?? []).map((r) => ({ bandId: r.booking_time_band_id, betrag: Number(r.betrag_monat), gueltigAb: r.gueltig_ab }));
}

/** Je Band der Preis, der zum Stichtag gilt (jüngste Fassung, die schon gültig war). Leere Map = keine Preisliste. */
export function preiseAmStichtag(zeilen: BeitragZeile[], stichtag: string): Map<string, number> {
  const jeBand = new Map<string, BeitragZeile>();
  for (const z of zeilen) {
    if (z.gueltigAb > stichtag) continue;
    const alt = jeBand.get(z.bandId);
    if (!alt || z.gueltigAb > alt.gueltigAb) jeBand.set(z.bandId, z);
  }
  return new Map([...jeBand].map(([band, z]) => [band, z.betrag]));
}

export type BeitraegeSumme = {
  summe: number;
  /** Kinder mit Preis / ohne Buchungszeit oder ohne Preis für ihr Band — die zweite Zahl wird als Hinweis gezeigt. */
  kinderMitPreis: number;
  kinderOhnePreis: number;
};

/** Elternbeiträge eines Monats: Summe der Bandpreise aller anwesenden Kinder. */
export function berechneElternbeitraege(kinderRows: PresenceRow[], preise: Map<string, number>): BeitraegeSumme {
  let summe = 0;
  let mit = 0;
  let ohne = 0;
  const gesehen = new Set<string>();
  for (const r of kinderRows) {
    if (gesehen.has(r.kind_id)) continue; // ein Kind kann mehrere Gewichtungsfaktoren haben
    gesehen.add(r.kind_id);
    const preis = r.buchungszeit_band_id ? preise.get(r.buchungszeit_band_id) : undefined;
    if (preis === undefined) ohne += 1;
    else {
      summe += preis;
      mit += 1;
    }
  }
  return { summe, kinderMitPreis: mit, kinderOhnePreis: ohne };
}

export type BeitraegeJeGruppe = { gruppeId: string | null; name: string; kinder: number; erloes: number; durchschnitt: number | null };

/** Erlös je Gruppe und Ø je Kind. Bewusst kein „Ergebnis je Gruppe“: Personalkosten lassen sich ohne Verteilschlüssel nicht fair zuordnen. */
export function beitraegeJeGruppe(
  kinderRows: PresenceRow[],
  preise: Map<string, number>,
  gruppen: { id: string; name: string }[]
): BeitraegeJeGruppe[] {
  const proKind = new Map<string, PresenceRow>();
  for (const r of kinderRows) if (!proKind.has(r.kind_id)) proKind.set(r.kind_id, r);
  const namen = new Map(gruppen.map((g) => [g.id, g.name]));
  const werte = new Map<string | null, { kinder: number; erloes: number; mitPreis: number }>();
  for (const r of proKind.values()) {
    const w = werte.get(r.gruppe_id) ?? { kinder: 0, erloes: 0, mitPreis: 0 };
    w.kinder += 1;
    const preis = r.buchungszeit_band_id ? preise.get(r.buchungszeit_band_id) : undefined;
    if (preis !== undefined) {
      w.erloes += preis;
      w.mitPreis += 1;
    }
    werte.set(r.gruppe_id, w);
  }
  return [...werte]
    .map(([gruppeId, w]) => ({
      gruppeId,
      name: gruppeId ? (namen.get(gruppeId) ?? "Gruppe") : "Ohne Gruppe",
      kinder: w.kinder,
      erloes: w.erloes,
      durchschnitt: w.mitPreis > 0 ? w.erloes / w.mitPreis : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}
