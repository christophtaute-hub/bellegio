"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung, canWritePersonal } from "@/lib/server/current-user-role";
import { toIsoDateString } from "@/lib/kita-datum";
import type { RohZeile, RohWert } from "@/lib/import/hilfen";
import {
  pruefeKinderImport,
  type KindImportErgebnis,
  type KindImportKontext,
} from "@/lib/import/kinder";
import {
  pruefeTeamImport,
  type TeamImportErgebnis,
  type TeamImportKontext,
} from "@/lib/import/team";

const MAX_ZEILEN = 1000;
const CHUNK = 100;

export type PruefungErgebnis<T> = { ok: true; ergebnis: T } | { ok: false; error: string };
export type UebernahmeErgebnis =
  | { ok: true; angelegt: number; uebersprungen: number; fehler: string[] }
  | { ok: false; error: string };

/** Nimmt vom Client nur einfache Tabellenwerte an und begrenzt Größe und Länge. */
function bereinige(rows: unknown): RohZeile[] | string {
  if (!Array.isArray(rows)) return "Die Datei konnte nicht gelesen werden.";
  if (rows.length === 0) return "Die Datei enthält keine Zeilen.";
  if (rows.length > MAX_ZEILEN) return `Die Datei hat mehr als ${MAX_ZEILEN} Zeilen. Bitte teile sie auf.`;
  return rows.map((zeile) => {
    const sauber: RohZeile = {};
    if (zeile && typeof zeile === "object") {
      for (const [schluessel, wert] of Object.entries(zeile as Record<string, unknown>).slice(0, 60)) {
        const w = wert as RohWert;
        sauber[schluessel.slice(0, 100)] =
          typeof w === "string" ? w.slice(0, 1000) : typeof w === "number" || typeof w === "boolean" ? w : null;
      }
    }
    return sauber;
  });
}

async function ladeKinderKontext(einrichtungId: string): Promise<KindImportKontext | null> {
  const supabase = await createClient();
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  if (!einrichtung) return null;
  const bundesland = einrichtung.bundesland_code ?? "by";

  const [{ data: gruppen }, { data: baender }, { data: gewichtungen }, { data: kinder }] = await Promise.all([
    supabase.from("gruppen").select("id, name").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase.from("booking_time_bands").select("id, label").eq("bundesland_code", bundesland).order("sort_order"),
    supabase.from("weighting_factors").select("id, code, label").eq("bundesland_code", bundesland),
    supabase
      .from("kinder")
      .select("vorname, nachname, geburtsdatum")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .limit(5000),
  ]);

  return {
    bundeslandCode: bundesland,
    gruppen: gruppen ?? [],
    baender: baender ?? [],
    gewichtungen: gewichtungen ?? [],
    vorhandene: kinder ?? [],
    heute: toIsoDateString(new Date()),
  };
}

async function ladeTeamKontext(einrichtungId: string): Promise<TeamImportKontext> {
  const supabase = await createClient();
  const [{ data: gruppen }, { data: team }] = await Promise.all([
    supabase.from("gruppen").select("id, name").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase.from("team").select("vorname, nachname").eq("einrichtung_id", einrichtungId).is("archived_at", null).limit(2000),
  ]);
  return {
    gruppen: gruppen ?? [],
    vorhandene: (team ?? []).map((m) => ({ vorname: m.vorname ?? "", nachname: m.nachname ?? "" })),
  };
}

async function kinderVorbereiten(
  rowsRoh: unknown
): Promise<{ ok: true; einrichtungId: string; ergebnis: KindImportErgebnis } | { ok: false; error: string }> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) {
    return { ok: false, error: "Du darfst in dieser Einrichtung keine Kinder anlegen (Bereich Belegung)." };
  }
  const rows = bereinige(rowsRoh);
  if (typeof rows === "string") return { ok: false, error: rows };
  const kontext = await ladeKinderKontext(einrichtungId);
  if (!kontext) return { ok: false, error: "Einrichtung nicht gefunden." };
  return { ok: true, einrichtungId, ergebnis: pruefeKinderImport(rows, kontext) };
}

export async function pruefeKinderDatei(rows: unknown): Promise<PruefungErgebnis<KindImportErgebnis>> {
  const v = await kinderVorbereiten(rows);
  return v.ok ? { ok: true, ergebnis: v.ergebnis } : v;
}

export async function uebernehmeKinderDatei(rows: unknown): Promise<UebernahmeErgebnis> {
  const v = await kinderVorbereiten(rows);
  if (!v.ok) return v;
  if (v.ergebnis.fehlendeSpalten.length > 0) {
    return { ok: false, error: `Pflichtspalten fehlen: ${v.ergebnis.fehlendeSpalten.join(", ")}.` };
  }

  const supabase = await createClient();
  const kinder = v.ergebnis.zeilen.flatMap((z) => (z.kind ? [z.kind] : []));
  const fehler: string[] = [];
  let angelegt = 0;

  for (let i = 0; i < kinder.length; i += CHUNK) {
    const teil = kinder.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("kinder")
      .insert(
        teil.map((k) => ({
          einrichtung_id: v.einrichtungId,
          vorname: k.vorname,
          nachname: k.nachname,
          geburtsdatum: k.geburtsdatum,
          geschlecht: k.geschlecht,
          status: k.status,
          gruppe_id: k.gruppe_id,
          platznummer: k.platznummer,
          eintritt: k.eintritt,
          austritt: k.austritt,
          vertrag_gueltig_bis: k.vertrag_gueltig_bis,
          buchungszeit_band_id: k.buchungszeit_band_id,
          wohnort: k.wohnort,
          notizen: k.notizen,
          hat_behinderung: k.hat_behinderung,
        }))
      )
      .select("id, vorname, nachname, geburtsdatum");
    if (error || !data) {
      fehler.push(`Kinder ${i + 1}–${i + teil.length} konnten nicht gespeichert werden.`);
      continue;
    }
    angelegt += data.length;

    const idNachSchluessel = new Map(data.map((d) => [`${d.vorname}|${d.nachname}|${d.geburtsdatum}`, d.id]));
    const faktoren = teil.flatMap((k) => {
      const kindId = idNachSchluessel.get(`${k.vorname}|${k.nachname}|${k.geburtsdatum}`);
      return kindId ? k.weighting_factor_ids.map((weighting_factor_id) => ({ kind_id: kindId, weighting_factor_id })) : [];
    });
    if (faktoren.length > 0) {
      const { error: faktorError } = await supabase.from("kind_weighting_factors").insert(faktoren);
      if (faktorError) fehler.push("Die Gewichtungsfaktoren einiger Kinder konnten nicht gespeichert werden. Bitte im Kind prüfen.");
    }
  }

  for (const pfad of ["/kinder", "/gruppen", "/dashboard", "/controlling", "/team"]) revalidatePath(pfad);
  return { ok: true, angelegt, uebersprungen: v.ergebnis.zeilen.length - kinder.length, fehler };
}

async function teamVorbereiten(
  rowsRoh: unknown
): Promise<{ ok: true; einrichtungId: string; ergebnis: TeamImportErgebnis } | { ok: false; error: string }> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const supabase = await createClient();
  if (!(await canWritePersonal(supabase, einrichtungId))) {
    return { ok: false, error: "Du darfst in dieser Einrichtung kein Personal anlegen (Bereich Personal)." };
  }
  const rows = bereinige(rowsRoh);
  if (typeof rows === "string") return { ok: false, error: rows };
  return { ok: true, einrichtungId, ergebnis: pruefeTeamImport(rows, await ladeTeamKontext(einrichtungId)) };
}

export async function pruefeTeamDatei(rows: unknown): Promise<PruefungErgebnis<TeamImportErgebnis>> {
  const v = await teamVorbereiten(rows);
  return v.ok ? { ok: true, ergebnis: v.ergebnis } : v;
}

export async function uebernehmeTeamDatei(rows: unknown): Promise<UebernahmeErgebnis> {
  const v = await teamVorbereiten(rows);
  if (!v.ok) return v;
  if (v.ergebnis.fehlendeSpalten.length > 0) {
    return { ok: false, error: `Pflichtspalten fehlen: ${v.ergebnis.fehlendeSpalten.join(", ")}.` };
  }

  const supabase = await createClient();
  const mitglieder = v.ergebnis.zeilen.flatMap((z) => (z.mitglied ? [z.mitglied] : []));
  const fehler: string[] = [];
  let angelegt = 0;

  for (let i = 0; i < mitglieder.length; i += CHUNK) {
    const teil = mitglieder.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("team")
      .insert(
        teil.map((m) => ({
          einrichtung_id: v.einrichtungId,
          vorname: m.vorname,
          nachname: m.nachname,
          rolle: m.rolle,
          role_category: m.role_category,
          fachkraft: m.role_category === "fk",
          wochenstunden: m.wochenstunden,
          gruppe_id: m.gruppe_id,
          status: m.status,
          eintritt: m.eintritt,
          austritt: m.austritt,
        }))
      )
      .select("id");
    if (error || !data) fehler.push(`Personen ${i + 1}–${i + teil.length} konnten nicht gespeichert werden.`);
    else angelegt += data.length;
  }

  for (const pfad of ["/team", "/controlling", "/dashboard", "/szenario"]) revalidatePath(pfad);
  return { ok: true, angelegt, uebersprungen: v.ergebnis.zeilen.length - mitglieder.length, fehler };
}
