import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PresenceRow } from "@/lib/dashboard/presence";

/** Eine Zeile der Preisliste. `gruppenart` null = gilt für alle Gruppen, `auswaertig` = Preis für Kinder, die außerhalb der Standort-Gemeinde wohnen. */
export type BeitragZeile = { bandId: string; betrag: number; gueltigAb: string; gruppenart?: string | null; auswaertig?: boolean };

/** Preise nach Schlüssel (Band, Gruppenart, Wohnsitz) — der zum Stichtag gültige Stand. */
export type PreisTabelle = Map<string, number>;

export function preisSchluessel(bandId: string, gruppenart: string | null | undefined, auswaertig: boolean | undefined): string {
  return `${bandId}|${gruppenart ?? ""}|${auswaertig ? 1 : 0}`;
}

/** Alle Preislisten-Zeilen einer Einrichtung (alle Fassungen). Braucht das Recht „Finanzübersicht“. */
export async function ladeBeitragszeilen(supabase: SupabaseClient<Database>, einrichtungId: string): Promise<BeitragZeile[]> {
  const { data } = await supabase
    .from("einrichtung_beitraege")
    .select("booking_time_band_id, betrag_monat, gueltig_ab, gruppenart, auswaertig")
    .eq("einrichtung_id", einrichtungId);
  return (data ?? []).map((r) => ({
    bandId: r.booking_time_band_id,
    betrag: Number(r.betrag_monat),
    gueltigAb: r.gueltig_ab,
    gruppenart: r.gruppenart,
    auswaertig: r.auswaertig,
  }));
}

/** Je Preisschlüssel der Preis, der zum Stichtag gilt (jüngste Fassung, die schon gültig war). Leere Map = keine Preisliste. */
export function preiseAmStichtag(zeilen: BeitragZeile[], stichtag: string): PreisTabelle {
  const jeSchluessel = new Map<string, BeitragZeile>();
  for (const z of zeilen) {
    if (z.gueltigAb > stichtag) continue;
    const key = preisSchluessel(z.bandId, z.gruppenart, z.auswaertig);
    const alt = jeSchluessel.get(key);
    if (!alt || z.gueltigAb > alt.gueltigAb) jeSchluessel.set(key, z);
  }
  return new Map([...jeSchluessel].map(([key, z]) => [key, z.betrag]));
}

/** Regeln der Einrichtung rund um den Preis. Prozentwerte = Anteil des Preises, den das Kind zahlt (50 = halber Preis, 0 = frei). */
export type BeitragsRegeln = {
  zweitProzent: number | null;
  abDrittProzent: number | null;
  /** Letzter Tag, an dem Eltern den Elternbeitragszuschuss erhalten (Bayern bis 31.12.2026); null = kein Zuschuss. */
  zuschussBis: string | null;
};

export const KEINE_REGELN: BeitragsRegeln = { zweitProzent: null, abDrittProzent: null, zuschussBis: null };

/** Was man über die Kinder wissen muss, um den richtigen Preis zu wählen. */
export type KindKontext = {
  /** Gruppenart je Gruppe („krippe“/„kindergarten“ …). */
  gruppenartByGruppeId: Map<string, string | null>;
  /** Kinder, die außerhalb der Standort-Gemeinde wohnen. */
  auswaertigeKindIds: Set<string>;
  /** Platz in der Geschwisterreihe (1 = zahlt den vollen Preis). */
  geschwisterByKindId: Map<string, number>;
  geburtsdatumByKindId: Map<string, string>;
  regeln: BeitragsRegeln;
};

export const OHNE_KONTEXT: KindKontext = {
  gruppenartByGruppeId: new Map(),
  auswaertigeKindIds: new Set(),
  geschwisterByKindId: new Map(),
  geburtsdatumByKindId: new Map(),
  regeln: KEINE_REGELN,
};

/** Erhalten die Eltern an diesem Stichtag den Elternbeitragszuschuss? Ab dem 1. September des Kalenderjahres, in dem das Kind drei wird, bis zum eingestellten Enddatum. */
export function erhaeltZuschuss(geburtsdatum: string | undefined, stichtag: string, zuschussBis: string | null): boolean {
  if (!zuschussBis || !geburtsdatum || stichtag > zuschussBis) return false;
  return stichtag >= `${Number(geburtsdatum.slice(0, 4)) + 3}-09-01`;
}

/** Geschwisterermäßigung: das 2. Kind zahlt `zweitProzent`, ab dem 3. Kind `abDrittProzent` des Preises. Kinder mit Zuschuss bekommen sie nicht. */
export function preisMitGeschwister(preis: number, kindId: string, kontext: KindKontext, stichtag?: string): number {
  const nummer = kontext.geschwisterByKindId.get(kindId) ?? 1;
  if (nummer < 2) return preis;
  const prozent = nummer === 2 ? kontext.regeln.zweitProzent : kontext.regeln.abDrittProzent;
  if (prozent === null) return preis;
  if (stichtag && erhaeltZuschuss(kontext.geburtsdatumByKindId.get(kindId), stichtag, kontext.regeln.zuschussBis)) return preis;
  return (preis * prozent) / 100;
}

/** Kinder außerhalb der Standort-Gemeinde: Wohnort weicht ab (ohne Groß-/Kleinschreibung). Ein leerer Wohnort zählt als „am Standort“. */
export function baueKindKontext(
  gruppen: { id: string; gruppenart: string | null }[],
  kinder: { id: string; wohnort: string | null; geburtsdatum?: string | null; geschwisterNummer?: number | null }[],
  standortGemeinde: string | null,
  regeln: BeitragsRegeln = KEINE_REGELN
): KindKontext {
  const standort = standortGemeinde?.trim().toLowerCase() ?? "";
  const auswaertig = new Set<string>();
  if (standort) {
    for (const k of kinder) {
      const wohnort = k.wohnort?.trim().toLowerCase() ?? "";
      if (wohnort && wohnort !== standort) auswaertig.add(k.id);
    }
  }
  return {
    gruppenartByGruppeId: new Map(gruppen.map((g) => [g.id, g.gruppenart])),
    auswaertigeKindIds: auswaertig,
    geschwisterByKindId: new Map(kinder.filter((k) => (k.geschwisterNummer ?? 1) > 1).map((k) => [k.id, k.geschwisterNummer as number])),
    geburtsdatumByKindId: new Map(kinder.filter((k) => k.geburtsdatum).map((k) => [k.id, k.geburtsdatum as string])),
    regeln,
  };
}

/** Der Preis für ein Kind: erst genau passend (Gruppenart, Wohnsitz), dann ohne Gruppenart, bei Auswärtigen zuletzt der Standardpreis. */
export function preisFuerKind(preise: PreisTabelle, row: PresenceRow, kontext: KindKontext): number | undefined {
  if (!row.buchungszeit_band_id) return undefined;
  const art = row.gruppe_id ? (kontext.gruppenartByGruppeId.get(row.gruppe_id) ?? null) : null;
  const auswaertig = kontext.auswaertigeKindIds.has(row.kind_id);
  const kandidaten: [string | null, boolean][] = [];
  if (auswaertig) kandidaten.push([art, true], [null, true]);
  kandidaten.push([art, false], [null, false]);
  for (const [gruppenart, aus] of kandidaten) {
    const preis = preise.get(preisSchluessel(row.buchungszeit_band_id, gruppenart, aus));
    if (preis !== undefined) return preis;
  }
  return undefined;
}

export type BeitraegeSumme = {
  summe: number;
  /** Kinder mit Preis / ohne Buchungszeit oder ohne Preis für ihr Band — die zweite Zahl wird als Hinweis gezeigt. */
  kinderMitPreis: number;
  kinderOhnePreis: number;
};

/** Elternbeiträge eines Monats: Summe der Preise aller anwesenden Kinder. */
export function berechneElternbeitraege(
  kinderRows: PresenceRow[],
  preise: PreisTabelle,
  kontext: KindKontext = OHNE_KONTEXT,
  stichtag?: string
): BeitraegeSumme {
  let summe = 0;
  let mit = 0;
  let ohne = 0;
  const gesehen = new Set<string>();
  for (const r of kinderRows) {
    if (gesehen.has(r.kind_id)) continue; // ein Kind kann mehrere Gewichtungsfaktoren haben
    gesehen.add(r.kind_id);
    const preis = preisFuerKind(preise, r, kontext);
    if (preis === undefined) ohne += 1;
    else {
      summe += preisMitGeschwister(preis, r.kind_id, kontext, stichtag);
      mit += 1;
    }
  }
  return { summe, kinderMitPreis: mit, kinderOhnePreis: ohne };
}

export type BeitraegeJeGruppe = { gruppeId: string | null; name: string; kinder: number; erloes: number; durchschnitt: number | null };

/** Erlös je Gruppe und Ø je Kind. Bewusst kein „Ergebnis je Gruppe“: Personalkosten lassen sich ohne Verteilschlüssel nicht fair zuordnen. */
export function beitraegeJeGruppe(
  kinderRows: PresenceRow[],
  preise: PreisTabelle,
  gruppen: { id: string; name: string }[],
  kontext: KindKontext = OHNE_KONTEXT,
  stichtag?: string
): BeitraegeJeGruppe[] {
  const proKind = new Map<string, PresenceRow>();
  for (const r of kinderRows) if (!proKind.has(r.kind_id)) proKind.set(r.kind_id, r);
  const namen = new Map(gruppen.map((g) => [g.id, g.name]));
  const werte = new Map<string | null, { kinder: number; erloes: number; mitPreis: number }>();
  for (const r of proKind.values()) {
    const w = werte.get(r.gruppe_id) ?? { kinder: 0, erloes: 0, mitPreis: 0 };
    w.kinder += 1;
    const preis = preisFuerKind(preise, r, kontext);
    if (preis !== undefined) {
      w.erloes += preisMitGeschwister(preis, r.kind_id, kontext, stichtag);
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
