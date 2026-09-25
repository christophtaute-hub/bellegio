import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";

export type TVoedEntgeltVersion = { entgeltgruppe: string; stufe: number; monatsbetrag: number } & Versioniert;

function tvoedSchluessel(entgeltgruppe: string, stufe: number): string {
  return `${entgeltgruppe}::${stufe}`;
}

/** Lädt alle je erfassten Fassungen der TVöD-SuE-Entgelttabelle, gruppiert nach
 * Entgeltgruppe × Stufe — gleiches Lade-/Gruppierungsmuster wie getNRWPersonalstundenVersionen. */
export async function getTVoedEntgeltVersionen(
  supabase: SupabaseClient<Database>
): Promise<Map<string, TVoedEntgeltVersion[]>> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase.from("tvoed_sue_entgelt").select("entgeltgruppe, stufe, monatsbetrag, gueltig_ab"),
    supabase.from("tvoed_sue_entgelt_historie").select("entgeltgruppe, stufe, monatsbetrag, gueltig_ab, gueltig_bis"),
  ]);

  const versionenByGroup = new Map<string, TVoedEntgeltVersion[]>();
  const anhaengen = (schluessel: string, version: TVoedEntgeltVersion) => {
    const liste = versionenByGroup.get(schluessel);
    if (liste) liste.push(version);
    else versionenByGroup.set(schluessel, [version]);
  };

  for (const h of historie ?? []) {
    anhaengen(tvoedSchluessel(h.entgeltgruppe, h.stufe), {
      entgeltgruppe: h.entgeltgruppe,
      stufe: h.stufe,
      monatsbetrag: h.monatsbetrag,
      gueltigAb: h.gueltig_ab,
      gueltigBis: h.gueltig_bis,
    });
  }
  for (const row of live ?? []) {
    anhaengen(tvoedSchluessel(row.entgeltgruppe, row.stufe), {
      entgeltgruppe: row.entgeltgruppe,
      stufe: row.stufe,
      monatsbetrag: row.monatsbetrag,
      gueltigAb: row.gueltig_ab,
      gueltigBis: null,
    });
  }
  return versionenByGroup;
}

/** Reine Funktion: löst je Entgeltgruppe×Stufe die zum Stichtag gültige Fassung auf und liefert
 * eine flache Lookup-Map (Schlüssel wie tvoedSchluessel) → Monatsbetrag bei Vollzeit. */
export function resolveTVoedTabelleAmStichtag(versionenByGroup: Map<string, TVoedEntgeltVersion[]>, stichtag: string): Map<string, number> {
  const tabelle = new Map<string, number>();
  for (const versionen of versionenByGroup.values()) {
    const treffer = versionAmStichtagMitFallback(versionen, stichtag);
    if (treffer) tabelle.set(tvoedSchluessel(treffer.entgeltgruppe, treffer.stufe), treffer.monatsbetrag);
  }
  return tabelle;
}

export type TeamVerguetungRow = {
  teamId: string;
  wochenstunden: number | null;
  entgeltgruppe: string | null;
  stufe: number | null;
  monatsgehaltManuell: number | null;
};

export type PersonalkostenErgebnisProMitarbeiter =
  | { teamId: string; status: "berechnet"; bruttoMonat: number; quelle: "manuell" | "tvoed" }
  | { teamId: string; status: "nicht_erfasst" };

/** Reine Funktion: manueller Override > TVöD-Tabelle > "nicht erfasst" (nie stillschweigend 0 —
 * ehrlicher Zähler, Muster nichtZugeordnet aus lib/controlling/jahreskategorisierung.ts). Teilzeit
 * skaliert linear über wochenstunden/vollzeitWochenstunden (Einrichtungs-Referenz, Standard 39 —
 * dieselbe Vollzeit-Referenz wie der Anstellungsschlüssel). */
export function berechnePersonalkostenProMitarbeiter(
  row: TeamVerguetungRow,
  tvoedTabelle: Map<string, number>,
  vollzeitWochenstunden: number
): PersonalkostenErgebnisProMitarbeiter {
  const teilzeitFaktor = vollzeitWochenstunden > 0 ? (row.wochenstunden ?? 0) / vollzeitWochenstunden : 0;

  if (row.monatsgehaltManuell !== null) {
    return { teamId: row.teamId, status: "berechnet", bruttoMonat: row.monatsgehaltManuell * teilzeitFaktor, quelle: "manuell" };
  }
  if (row.entgeltgruppe && row.stufe !== null) {
    const vollzeitBetrag = tvoedTabelle.get(tvoedSchluessel(row.entgeltgruppe, row.stufe));
    if (vollzeitBetrag !== undefined) {
      return { teamId: row.teamId, status: "berechnet", bruttoMonat: vollzeitBetrag * teilzeitFaktor, quelle: "tvoed" };
    }
  }
  return { teamId: row.teamId, status: "nicht_erfasst" };
}

export type PersonalkostenGesamt = {
  bruttoSummeMonat: number;
  lohnnebenkostenBetrag: number;
  /** Nur der Monatsanteil (Jahressumme/12), nicht die volle Jahressonderzahlung auf einmal — ein
   * November-Peak wäre in der Forecast-Tabelle sonst schwer lesbar, im UI-Hinweistext erwähnt. */
  jahressonderzahlungAnteilMonat: number;
  personalkostenGesamtMonat: number;
  nichtErfasst: number;
};

/** Aggregiert über alle Team-Mitglieder. Lohnnebenkosten als Prozentsatz auf die Brutto-Summe,
 * Jahressonderzahlung gleichmäßig auf jeden Monat verteilt statt einmalig im November. */
export function berechnePersonalkostenGesamt(
  ergebnisse: PersonalkostenErgebnisProMitarbeiter[],
  lohnnebenkostenProzent: number,
  jahressonderzahlungProzent: number
): PersonalkostenGesamt {
  const berechnete = ergebnisse.filter(
    (e): e is Extract<PersonalkostenErgebnisProMitarbeiter, { status: "berechnet" }> => e.status === "berechnet"
  );
  const bruttoSummeMonat = berechnete.reduce((sum, e) => sum + e.bruttoMonat, 0);
  const lohnnebenkostenBetrag = bruttoSummeMonat * (lohnnebenkostenProzent / 100);
  const jahressonderzahlungAnteilMonat = (bruttoSummeMonat * (jahressonderzahlungProzent / 100)) / 12;
  return {
    bruttoSummeMonat,
    lohnnebenkostenBetrag,
    jahressonderzahlungAnteilMonat,
    personalkostenGesamtMonat: bruttoSummeMonat + lohnnebenkostenBetrag + jahressonderzahlungAnteilMonat,
    nichtErfasst: ergebnisse.length - berechnete.length,
  };
}
