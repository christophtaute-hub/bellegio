"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung, canWritePersonal } from "@/lib/server/current-user-role";
import { toIsoDateString } from "@/lib/kita-datum";
import type { RohZeile, RohWert } from "@/lib/import/hilfen";
import type { ImportQuelle } from "@/lib/import/abgleich";
import { ergaenzeKinderAbgleich, type KindBestand } from "@/lib/import/abgleich-kinder";
import { ergaenzeTeamAbgleich, type TeamBestand } from "@/lib/import/abgleich-team";
import { schreibeGruppenHistorie } from "@/lib/kinder/gruppen-historie";
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

/** „neu“: nur neue Einträge anlegen, Vorhandene überspringen. „abgleich“: Vorhandene (über die Nummer der Quelle oder den Namen
 * erkannt) werden aktualisiert — leere Zellen und fehlende Spalten ändern nichts, nichts wird gelöscht. */
export type ImportOptionen = { modus: "neu" | "abgleich"; quelle: ImportQuelle };
const QUELLEN: ImportQuelle[] = ["kigaroo", "rexx", "excel"];
function normOptionen(o: ImportOptionen | undefined): ImportOptionen {
  return { modus: o?.modus === "abgleich" ? "abgleich" : "neu", quelle: o && QUELLEN.includes(o.quelle) ? o.quelle : "excel" };
}

const MAX_ZEILEN = 1000;
const CHUNK = 100;

export type PruefungErgebnis<T> = { ok: true; ergebnis: T } | { ok: false; error: string };
export type UebernahmeErgebnis =
  | { ok: true; angelegt: number; aktualisiert: number; uebersprungen: number; fehler: string[] }
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

async function ladeKinderKontext(einrichtungId: string, abgleich: boolean): Promise<KindImportKontext | null> {
  const supabase = await createClient();
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  if (!einrichtung) return null;
  const bundesland = einrichtung.bundesland_code ?? "by";

  const [{ data: gruppen }, { data: baender }, { data: gewichtungen }, { data: kinder }] = await Promise.all([
    supabase.from("gruppen").select("id, name, gruppenart").eq("einrichtung_id", einrichtungId).is("archived_at", null),
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
    abgleich,
  };
}

async function ladeKinderBestand(einrichtungId: string): Promise<KindBestand[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kinder")
    .select("id, vorname, nachname, geburtsdatum, externe_id, datenquelle, gruppe_id, status, eintritt, austritt, vertrag_gueltig_bis, buchungszeit_band_id, wohnort, hat_behinderung")
    .eq("einrichtung_id", einrichtungId)
    .is("archived_at", null)
    .limit(5000);
  return data ?? [];
}

async function ladeTeamKontext(einrichtungId: string, abgleich: boolean): Promise<TeamImportKontext> {
  const supabase = await createClient();
  const [{ data: gruppen }, { data: team }] = await Promise.all([
    supabase.from("gruppen").select("id, name").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase.from("team").select("vorname, nachname").eq("einrichtung_id", einrichtungId).is("archived_at", null).limit(2000),
  ]);
  return {
    gruppen: gruppen ?? [],
    vorhandene: (team ?? []).map((m) => ({ vorname: m.vorname ?? "", nachname: m.nachname ?? "" })),
    abgleich,
  };
}

async function ladeTeamBestand(einrichtungId: string): Promise<TeamBestand[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team")
    .select("id, vorname, nachname, externe_id, datenquelle, rolle, role_category, wochenstunden, gruppe_id, status, eintritt, austritt")
    .eq("einrichtung_id", einrichtungId)
    .is("archived_at", null)
    .limit(2000);
  return (data ?? []).map((m) => ({ ...m, wochenstunden: m.wochenstunden === null ? null : Number(m.wochenstunden) }));
}

async function kinderVorbereiten(
  rowsRoh: unknown,
  optionen: ImportOptionen
): Promise<{ ok: true; einrichtungId: string; ergebnis: KindImportErgebnis } | { ok: false; error: string }> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) {
    return { ok: false, error: "Du darfst in dieser Einrichtung keine Kinder anlegen (Bereich Belegung)." };
  }
  const rows = bereinige(rowsRoh);
  if (typeof rows === "string") return { ok: false, error: rows };
  const abgleich = optionen.modus === "abgleich";
  const kontext = await ladeKinderKontext(einrichtungId, abgleich);
  if (!kontext) return { ok: false, error: "Einrichtung nicht gefunden." };
  let ergebnis = pruefeKinderImport(rows, kontext);
  if (abgleich && ergebnis.fehlendeSpalten.length === 0) {
    ergebnis = ergaenzeKinderAbgleich(ergebnis, await ladeKinderBestand(einrichtungId), optionen.quelle, kontext);
  }
  return { ok: true, einrichtungId, ergebnis };
}

export async function pruefeKinderDatei(rows: unknown, optionen?: ImportOptionen): Promise<PruefungErgebnis<KindImportErgebnis>> {
  const v = await kinderVorbereiten(rows, normOptionen(optionen));
  return v.ok ? { ok: true, ergebnis: v.ergebnis } : v;
}

export async function uebernehmeKinderDatei(rows: unknown, optionen?: ImportOptionen): Promise<UebernahmeErgebnis> {
  const opt = normOptionen(optionen);
  const v = await kinderVorbereiten(rows, opt);
  if (!v.ok) return v;
  if (v.ergebnis.fehlendeSpalten.length > 0) {
    return { ok: false, error: `Pflichtspalten fehlen: ${v.ergebnis.fehlendeSpalten.join(", ")}.` };
  }

  const supabase = await createClient();
  const alle = v.ergebnis.zeilen.flatMap((z) => (z.kind ? [z] : []));
  // Im Abgleich nur die wirklich neuen anlegen, die erkannten werden unten aktualisiert
  const kinder = alle.filter((z) => !z.abgleich || z.abgleich.aktion === "neu").flatMap((z) => (z.kind ? [z.kind] : []));
  const zuAktualisieren = alle.filter((z) => z.abgleich?.aktion === "aktualisieren");
  const fehler: string[] = [];
  let angelegt = 0;
  let aktualisiert = 0;

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
          eintritt: k.eintritt,
          austritt: k.austritt,
          vertrag_gueltig_bis: k.vertrag_gueltig_bis,
          buchungszeit_band_id: k.buchungszeit_band_id,
          wohnort: k.wohnort,
          hat_behinderung: k.hat_behinderung,
          externe_id: k.externe_id,
          datenquelle: k.externe_id ? opt.quelle : null,
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

    // Baseline für die Buchungszeit-Historie, analog zum Backfill bestehender Kinder: "dieses Band gilt seit dem Eintritt".
    const historie = teil.flatMap((k) => {
      const kindId = idNachSchluessel.get(`${k.vorname}|${k.nachname}|${k.geburtsdatum}`);
      return kindId ? [{ kind_id: kindId, buchungszeit_band_id: k.buchungszeit_band_id, gueltig_ab: k.eintritt ?? k.geburtsdatum }] : [];
    });
    if (historie.length > 0) {
      const { error: historieError } = await supabase.from("kind_buchungszeit_historie").insert(historie);
      if (historieError) fehler.push("Die Buchungszeit-Historie einiger Kinder konnte nicht gespeichert werden. Bitte im Kind prüfen.");
    }

    // Eine mitgelieferte Notiz wird zum ersten Verlaufseintrag statt in ein einzelnes, überschreibbares Feld.
    const notizen = teil.flatMap((k) => {
      const kindId = idNachSchluessel.get(`${k.vorname}|${k.nachname}|${k.geburtsdatum}`);
      return kindId && k.notizen ? [{ kind_id: kindId, text: k.notizen }] : [];
    });
    if (notizen.length > 0) {
      const { error: notizenError } = await supabase.from("kind_notizen_verlauf").insert(notizen);
      if (notizenError) fehler.push("Die Notizen einiger Kinder konnten nicht gespeichert werden. Bitte im Kind prüfen.");
    }
  }

  // Abgleich: nur die Felder ändern, die sich laut Prüfung unterscheiden
  if (zuAktualisieren.length > 0) {
    const heute = toIsoDateString(new Date());
    const ids = zuAktualisieren.map((z) => z.abgleich!.id as string);
    const { data: bisher } = await supabase.from("kinder").select("id, gruppe_id, buchungszeit_band_id, eintritt").in("id", ids);
    const bisherNachId = new Map((bisher ?? []).map((b) => [b.id, b]));
    for (const z of zuAktualisieren) {
      const k = z.kind!;
      const kindId = z.abgleich!.id as string;
      const felder = new Set(z.abgleich!.aenderungen.map((a) => a.feld));
      const update: Database["public"]["Tables"]["kinder"]["Update"] = {};
      if (felder.has("vorname")) update.vorname = k.vorname;
      if (felder.has("nachname")) update.nachname = k.nachname;
      if (felder.has("geburtsdatum")) update.geburtsdatum = k.geburtsdatum;
      if (felder.has("gruppe")) update.gruppe_id = k.gruppe_id;
      if (felder.has("status")) update.status = k.status;
      if (felder.has("eintritt")) update.eintritt = k.eintritt;
      if (felder.has("austritt")) update.austritt = k.austritt;
      if (felder.has("vertrag_bis")) update.vertrag_gueltig_bis = k.vertrag_gueltig_bis;
      if (felder.has("buchungszeit")) update.buchungszeit_band_id = k.buchungszeit_band_id;
      if (felder.has("wohnort")) update.wohnort = k.wohnort;
      if (felder.has("istatus")) update.hat_behinderung = k.hat_behinderung;
      if (felder.has("externe_id")) {
        update.externe_id = k.externe_id;
        update.datenquelle = opt.quelle;
      }
      const { error } = await supabase.from("kinder").update(update).eq("id", kindId);
      if (error) {
        fehler.push(`${z.anzeige}: konnte nicht aktualisiert werden.`);
        continue;
      }
      aktualisiert += 1;
      const alt = bisherNachId.get(kindId);
      if (felder.has("buchungszeit") && alt?.buchungszeit_band_id !== k.buchungszeit_band_id) {
        // Wie in der Kind-Bearbeitung: ein neuer Historie-Eintrag ab heute, damit vergangene Stichtage die damalige Buchungszeit behalten.
        await supabase
          .from("kind_buchungszeit_historie")
          .upsert({ kind_id: kindId, buchungszeit_band_id: k.buchungszeit_band_id, gueltig_ab: heute }, { onConflict: "kind_id,gueltig_ab" });
      }
      if (felder.has("gruppe")) {
        await schreibeGruppenHistorie(supabase, kindId, alt?.gruppe_id ?? null, k.gruppe_id, { eintritt: alt?.eintritt ?? k.eintritt, heute });
      }
    }
  }

  for (const pfad of ["/kinder", "/gruppen", "/dashboard", "/controlling", "/team"]) revalidatePath(pfad);
  return { ok: true, angelegt, aktualisiert, uebersprungen: v.ergebnis.zeilen.length - alle.length, fehler };
}

async function teamVorbereiten(
  rowsRoh: unknown,
  optionen: ImportOptionen
): Promise<{ ok: true; einrichtungId: string; ergebnis: TeamImportErgebnis } | { ok: false; error: string }> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return { ok: false, error: "Keine aktive Einrichtung ausgewählt." };
  const supabase = await createClient();
  if (!(await canWritePersonal(supabase, einrichtungId))) {
    return { ok: false, error: "Du darfst in dieser Einrichtung kein Personal anlegen (Bereich Personal)." };
  }
  const rows = bereinige(rowsRoh);
  if (typeof rows === "string") return { ok: false, error: rows };
  const abgleich = optionen.modus === "abgleich";
  const kontext = await ladeTeamKontext(einrichtungId, abgleich);
  let ergebnis = pruefeTeamImport(rows, kontext);
  if (abgleich && ergebnis.fehlendeSpalten.length === 0) {
    ergebnis = ergaenzeTeamAbgleich(ergebnis, await ladeTeamBestand(einrichtungId), optionen.quelle, kontext);
  }
  return { ok: true, einrichtungId, ergebnis };
}

export async function pruefeTeamDatei(rows: unknown, optionen?: ImportOptionen): Promise<PruefungErgebnis<TeamImportErgebnis>> {
  const v = await teamVorbereiten(rows, normOptionen(optionen));
  return v.ok ? { ok: true, ergebnis: v.ergebnis } : v;
}

export async function uebernehmeTeamDatei(rows: unknown, optionen?: ImportOptionen): Promise<UebernahmeErgebnis> {
  const opt = normOptionen(optionen);
  const v = await teamVorbereiten(rows, opt);
  if (!v.ok) return v;
  if (v.ergebnis.fehlendeSpalten.length > 0) {
    return { ok: false, error: `Pflichtspalten fehlen: ${v.ergebnis.fehlendeSpalten.join(", ")}.` };
  }

  const supabase = await createClient();
  const alle = v.ergebnis.zeilen.flatMap((z) => (z.mitglied ? [z] : []));
  const mitglieder = alle.filter((z) => !z.abgleich || z.abgleich.aktion === "neu").flatMap((z) => (z.mitglied ? [z.mitglied] : []));
  const zuAktualisieren = alle.filter((z) => z.abgleich?.aktion === "aktualisieren");
  const fehler: string[] = [];
  let angelegt = 0;
  let aktualisiert = 0;

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
          externe_id: m.externe_id,
          datenquelle: m.externe_id ? opt.quelle : null,
        }))
      )
      .select("id");
    if (error || !data) fehler.push(`Personen ${i + 1}–${i + teil.length} konnten nicht gespeichert werden.`);
    else angelegt += data.length;
  }

  for (const z of zuAktualisieren) {
    const m = z.mitglied!;
    const felder = new Set(z.abgleich!.aenderungen.map((a) => a.feld));
    const update: Database["public"]["Tables"]["team"]["Update"] = {};
    if (felder.has("vorname")) update.vorname = m.vorname;
    if (felder.has("nachname")) update.nachname = m.nachname;
    if (felder.has("rolle")) {
      update.rolle = m.rolle;
      update.role_category = m.role_category;
      update.fachkraft = m.role_category === "fk";
    }
    if (felder.has("wochenstunden")) update.wochenstunden = m.wochenstunden;
    if (felder.has("gruppe")) update.gruppe_id = m.gruppe_id;
    if (felder.has("status")) update.status = m.status;
    if (felder.has("eintritt")) update.eintritt = m.eintritt;
    if (felder.has("austritt")) update.austritt = m.austritt;
    if (felder.has("externe_id")) {
      update.externe_id = m.externe_id;
      update.datenquelle = opt.quelle;
    }
    const { error } = await supabase.from("team").update(update).eq("id", z.abgleich!.id as string);
    if (error) fehler.push(`${z.anzeige}: konnte nicht aktualisiert werden.`);
    else aktualisiert += 1;
  }

  for (const pfad of ["/team", "/controlling", "/dashboard", "/szenario"]) revalidatePath(pfad);
  return { ok: true, angelegt, aktualisiert, uebersprungen: v.ergebnis.zeilen.length - alle.length, fehler };
}
