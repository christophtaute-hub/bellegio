import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";
import type { PresenceRow } from "@/lib/dashboard/presence";

// --- Bayern (Art. 21 BayKiBiG) ---

export type BayernBasiswert = { basiswert: number; qualitaetsbonus: number };
export type BayernBasiswertVersion = BayernBasiswert & Versioniert;

/** Lädt alle je erfassten Fassungen (aktuelle Zeile + Historie) — Milestone 29c, nutzt dieselbe
 * Versionierung wie Milestone 29b (lib/regelwerk/verlauf.ts). */
export async function getBayernBasiswertVersionen(
  supabase: SupabaseClient<Database>
): Promise<BayernBasiswertVersion[]> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase.from("bayern_foerderung_basiswert").select("basiswert, qualitaetsbonus, gueltig_ab").eq("bundesland_code", "by"),
    supabase.from("bayern_foerderung_basiswert_historie").select("basiswert, qualitaetsbonus, gueltig_ab, gueltig_bis").eq("bundesland_code", "by"),
  ]);
  const versionen: BayernBasiswertVersion[] = (historie ?? []).map((h) => ({
    basiswert: h.basiswert,
    qualitaetsbonus: h.qualitaetsbonus,
    gueltigAb: h.gueltig_ab,
    gueltigBis: h.gueltig_bis,
  }));
  for (const row of live ?? []) {
    versionen.push({ basiswert: row.basiswert, qualitaetsbonus: row.qualitaetsbonus, gueltigAb: row.gueltig_ab, gueltigBis: null });
  }
  return versionen;
}

export function resolveBayernBasiswertAmStichtag(versionen: BayernBasiswertVersion[], stichtag: string): BayernBasiswert | null {
  const treffer = versionAmStichtagMitFallback(versionen, stichtag);
  return treffer ? { basiswert: treffer.basiswert, qualitaetsbonus: treffer.qualitaetsbonus } : null;
}

/** Reine Funktion: Art. 21 BayKiBiG — Basiswert × Buchungszeitfaktor × Gewichtungsfaktor je Kind,
 * plus Qualitätsbonus. Nutzt dieselbe PresenceRow-Form wie kinder_presence_at_date
 * (buchungszeit_factor, weighting_factor_value) statt eigene Faktoren neu herzuleiten.
 * Offene Annahme (nicht abschließend quellenbelegt, vor Produktivbetrieb gegenprüfen): der
 * Qualitätsbonus wird als fixer Betrag je belegtem Platz angenommen, nicht buchungszeit-skaliert. */
export function berechneBayernFoerdererloesProKind(row: PresenceRow, basiswert: BayernBasiswert): number {
  const buchungszeitFactor = row.buchungszeit_factor ?? 0;
  return buchungszeitFactor * row.weighting_factor_value * basiswert.basiswert + basiswert.qualitaetsbonus;
}

export function berechneBayernFoerdererloesGesamt(rows: PresenceRow[], basiswert: BayernBasiswert | null): number {
  if (!basiswert) return 0;
  return rows.reduce((sum, row) => sum + berechneBayernFoerdererloesProKind(row, basiswert), 0);
}

// --- NRW (KiBiz §§32-34, §37 — Kindpauschale) ---

export type NRWKindpauschaleRow = { gruppenform: string; buchungszeitStunden: number; betragJahr: number };
export type NRWKindpauschaleVersion = NRWKindpauschaleRow & Versioniert;

function nrwGruppenSchluessel(gruppenform: string, buchungszeitStunden: number): string {
  return `${gruppenform}::${buchungszeitStunden}`;
}

/** Lädt alle je erfassten Fassungen, gruppiert nach Gruppenform × Buchungszeit-Stunden — gleiches
 * Muster wie getNRWPersonalstundenVersionen (lib/team/personalschluessel-nrw.ts). */
export async function getNRWKindpauschalenVersionen(
  supabase: SupabaseClient<Database>
): Promise<Map<string, NRWKindpauschaleVersion[]>> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase.from("nrw_kindpauschalen").select("gruppenform, buchungszeit_stunden, betrag_jahr, gueltig_ab").eq("bundesland_code", "nrw"),
    supabase
      .from("nrw_kindpauschalen_historie")
      .select("gruppenform, buchungszeit_stunden, betrag_jahr, gueltig_ab, gueltig_bis")
      .eq("bundesland_code", "nrw"),
  ]);

  const versionenByGroup = new Map<string, NRWKindpauschaleVersion[]>();
  const anhaengen = (schluessel: string, version: NRWKindpauschaleVersion) => {
    const liste = versionenByGroup.get(schluessel);
    if (liste) liste.push(version);
    else versionenByGroup.set(schluessel, [version]);
  };

  for (const h of historie ?? []) {
    anhaengen(nrwGruppenSchluessel(h.gruppenform, h.buchungszeit_stunden), {
      gruppenform: h.gruppenform,
      buchungszeitStunden: h.buchungszeit_stunden,
      betragJahr: h.betrag_jahr,
      gueltigAb: h.gueltig_ab,
      gueltigBis: h.gueltig_bis,
    });
  }
  for (const row of live ?? []) {
    anhaengen(nrwGruppenSchluessel(row.gruppenform, row.buchungszeit_stunden), {
      gruppenform: row.gruppenform,
      buchungszeitStunden: row.buchungszeit_stunden,
      betragJahr: row.betrag_jahr,
      gueltigAb: row.gueltig_ab,
      gueltigBis: null,
    });
  }
  return versionenByGroup;
}

/** Reine Funktion: löst je Gruppe (Gruppenform × Buchungszeit) die zum Stichtag gültige Fassung auf
 * und liefert eine flache NRWKindpauschaleRow[]-Liste. */
export function resolveNRWKindpauschalenTabelleAmStichtag(
  versionenByGroup: Map<string, NRWKindpauschaleVersion[]>,
  stichtag: string
): NRWKindpauschaleRow[] {
  const zeilen: NRWKindpauschaleRow[] = [];
  for (const versionen of versionenByGroup.values()) {
    const treffer = versionAmStichtagMitFallback(versionen, stichtag);
    if (treffer) {
      zeilen.push({ gruppenform: treffer.gruppenform, buchungszeitStunden: treffer.buchungszeitStunden, betragJahr: treffer.betragJahr });
    }
  }
  return zeilen;
}

/** Reine Funktion: feste Jahrespauschale je Kind nach Gruppenform × Buchungszeitband SEINER Gruppe
 * (nicht des Kindes selbst — anders als Bayern rechnet NRW gruppenbezogen wie
 * findeNRWZeile/buildNRWPersonalplanung), /12 für den Monatswert. */
export function berechneNRWFoerdererloesProKindMonat(
  gruppenform: string | null,
  buchungszeitStunden: number | null,
  tabelle: NRWKindpauschaleRow[]
): number {
  if (!gruppenform || buchungszeitStunden === null) return 0;
  const zeile = tabelle.find((r) => r.gruppenform === gruppenform && r.buchungszeitStunden === buchungszeitStunden);
  return zeile ? zeile.betragJahr / 12 : 0;
}

export function berechneNRWFoerdererloesGesamt(
  kinderGruppen: (string | null)[],
  gruppenById: Map<string, { nrwGruppenform: string | null; nrwBuchungszeitStunden: number | null }>,
  tabelle: NRWKindpauschaleRow[]
): number {
  return kinderGruppen.reduce((sum, gruppeId) => {
    const gruppe = gruppeId ? gruppenById.get(gruppeId) : undefined;
    return sum + berechneNRWFoerdererloesProKindMonat(gruppe?.nrwGruppenform ?? null, gruppe?.nrwBuchungszeitStunden ?? null, tabelle);
  }, 0);
}
