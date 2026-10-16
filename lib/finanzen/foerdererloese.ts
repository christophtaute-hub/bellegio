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

/** Reine Funktion (Jahresbetrag je Kind!): Art. 21 Abs. 2 BayKiBiG — "der jährliche staatliche Förderbetrag pro Kind … errechnet sich als
 * Produkt aus Basiswert, Buchungszeit- und Gewichtungsfaktor". Der Qualitätsbonus erhöht den Basiswert (Art. 23 Abs. 1 Satz 2
 * BayKiBiG, "Basiswert plus") und geht damit in dieses Produkt ein, er ist kein pauschaler Zuschlag je Kind. Nutzt dieselbe
 * PresenceRow-Form wie kinder_presence_at_date (buchungszeit_factor, weighting_factor_value) statt eigene Faktoren neu herzuleiten.
 * Nur der staatliche Regelfall (ohne U3-Zuschlag, ohne Eigenanteil der Gemeinde) — die vollständige Trägerförderung rechnet
 * berechneBayernFoerderungGesamt weiter unten. */
export function berechneBayernFoerdererloesProKind(row: PresenceRow, basiswert: BayernBasiswert): number {
  const buchungszeitFactor = row.buchungszeit_factor ?? 0;
  return buchungszeitFactor * row.weighting_factor_value * (basiswert.basiswert + basiswert.qualitaetsbonus);
}

export function berechneBayernFoerdererloesGesamt(rows: PresenceRow[], basiswert: BayernBasiswert | null): number {
  if (!basiswert) return 0;
  return rows.reduce((sum, row) => sum + berechneBayernFoerdererloesProKind(row, basiswert), 0);
}

/** § 24 Abs. 1 Satz 2 AVBayKiBiG: Zuschlag auf den Buchungszeitfaktor für Kinder unter drei Jahren (nur staatlicher Anteil). */
export const BAYERN_U3_ZUSCHLAG = 0.15;
/** Der U3-Zuschlag gilt bis zum 31.12.2026; mit der Reform 2027 entfällt er, der Qualitätsbonus gilt dann für alle Kinder. */
export const BAYERN_U3_ZUSCHLAG_BIS = "2026-12-31";

/** Zählt das Kind für die Förderung als „unter drei“? Ja: jünger als drei Jahre, oder (Art. 21 Abs. 5 Satz 5 BayKiBiG) in einer
 * Krippe drei geworden — dann gilt der Krippenfaktor bis zum Ende des Kindergartenjahres (31.08.) weiter. Ohne Geburtsdatum
 * entscheidet der Gewichtungsfaktor „u3“. */
export function istU3FuerFoerderung(
  geburtsdatum: string | undefined,
  gruppenart: string | null | undefined,
  stichtag: string,
  gewichtungsCode?: string | null
): boolean {
  if (!geburtsdatum) return gewichtungsCode === "u3";
  const dritterGeburtstag = `${Number(geburtsdatum.slice(0, 4)) + 3}${geburtsdatum.slice(4)}`;
  if (stichtag < dritterGeburtstag) return true;
  if (gruppenart !== "krippe") return false;
  const jahr = Number(dritterGeburtstag.slice(0, 4));
  const kindergartenjahrEnde = dritterGeburtstag <= `${jahr}-08-31` ? `${jahr}-08-31` : `${jahr + 1}-08-31`;
  return stichtag <= kindergartenjahrEnde;
}

export type BayernKindFoerderung = { staatlich: number; kommunal: number };

/** Reine Funktion (Jahresbeträge je Kind), Stand 2026:
 * - staatlich (Art. 21): (Basiswert + Qualitätsbonus) × Buchungszeitfaktor × Gewichtungsfaktor. Für Kinder unter drei Jahren
 *   erhöht sich der Buchungszeitfaktor um 0,15 (§ 24 Abs. 1 S. 2 AVBayKiBiG) — dann entfällt der Qualitätsbonus für dieses
 *   Kind (§ 20 Abs. 2 S. 2 AVBayKiBiG): Basiswert × (Faktor + 0,15) × Gewichtungsfaktor.
 * - kommunal (Art. 22 Abs. 2): Eigenanteil der Gemeinde = Basiswert ohne Erhöhung × Buchungszeitfaktor (ohne 0,15) × Gewichtungsfaktor.
 * Der Träger hat Anspruch auf die Summe (Art. 22 Abs. 1). Kinder ohne Buchungszeit werden nicht gefördert. */
export function berechneBayernFoerderungProKind(row: PresenceRow, basiswert: BayernBasiswert, u3Zuschlag: boolean): BayernKindFoerderung {
  const faktor = row.buchungszeit_factor;
  if (faktor === null || faktor === undefined) return { staatlich: 0, kommunal: 0 };
  const gewicht = row.weighting_factor_value;
  const staatlich = u3Zuschlag
    ? basiswert.basiswert * (faktor + BAYERN_U3_ZUSCHLAG) * gewicht
    : (basiswert.basiswert + basiswert.qualitaetsbonus) * faktor * gewicht;
  return { staatlich, kommunal: basiswert.basiswert * faktor * gewicht };
}

export type BayernFoerderungKontext = {
  geburtsdatumByKindId: Map<string, string>;
  gruppenartByGruppeId: Map<string, string | null>;
};

/** Summe über alle anwesenden Kinder (Jahresbeträge). Ein Kind zählt einmal, mit seinem höchsten Gewichtungsfaktor. */
export function berechneBayernFoerderungGesamt(
  rows: PresenceRow[],
  basiswert: BayernBasiswert | null,
  kontext: BayernFoerderungKontext,
  stichtag: string
): BayernKindFoerderung {
  if (!basiswert) return { staatlich: 0, kommunal: 0 };
  const proKind = new Map<string, PresenceRow>();
  for (const r of rows) {
    const bisher = proKind.get(r.kind_id);
    if (!bisher || r.weighting_factor_value > bisher.weighting_factor_value) proKind.set(r.kind_id, r);
  }
  const zuschlagMoeglich = stichtag <= BAYERN_U3_ZUSCHLAG_BIS;
  let staatlich = 0;
  let kommunal = 0;
  for (const r of proKind.values()) {
    const gruppenart = r.gruppe_id ? (kontext.gruppenartByGruppeId.get(r.gruppe_id) ?? null) : null;
    const u3 = zuschlagMoeglich && istU3FuerFoerderung(kontext.geburtsdatumByKindId.get(r.kind_id), gruppenart, stichtag, r.weighting_factor_code);
    const f = berechneBayernFoerderungProKind(r, basiswert, u3);
    staatlich += f.staatlich;
    kommunal += f.kommunal;
  }
  return { staatlich, kommunal };
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
