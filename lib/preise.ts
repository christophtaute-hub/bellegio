import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Feste Staffelgrenzen für den Kind-Preis (Variante B) — bewusst im Code statt in der Datenbank, nur die drei
 * Preise je Stufe sind pflegbar. Gilt je Einrichtung, nicht gebündelt über mehrere Einrichtungen eines Trägers. */
export const STAFFEL_GRENZE_1 = 30;
export const STAFFEL_GRENZE_2 = 60;

/** Öffentliche Listenpreise (netto, je Monat, je Einrichtung). null = noch nicht festgelegt. */
export type Listenpreise = {
  grundgebuehr: number | null;
  proKind1Bis30: number | null;
  proKind31Bis60: number | null;
  proKindAb61: number | null;
  hinweis: string | null;
};

export const KEINE_PREISE: Listenpreise = {
  grundgebuehr: null,
  proKind1Bis30: null,
  proKind31Bis60: null,
  proKindAb61: null,
  hinweis: null,
};

export function hatPreise(preise: Listenpreise): boolean {
  return (
    preise.grundgebuehr !== null ||
    preise.proKind1Bis30 !== null ||
    preise.proKind31Bis60 !== null ||
    preise.proKindAb61 !== null
  );
}

export async function ladeListenpreise(supabase: SupabaseClient<Database>): Promise<Listenpreise> {
  const { data } = await supabase
    .from("listenpreise")
    .select("grundgebuehr_pro_einrichtung, preis_pro_kind_1_30, preis_pro_kind_31_60, preis_pro_kind_ab_61, hinweis")
    .eq("id", true)
    .maybeSingle();
  if (!data) return KEINE_PREISE;
  return {
    grundgebuehr: data.grundgebuehr_pro_einrichtung === null ? null : Number(data.grundgebuehr_pro_einrichtung),
    proKind1Bis30: data.preis_pro_kind_1_30 === null ? null : Number(data.preis_pro_kind_1_30),
    proKind31Bis60: data.preis_pro_kind_31_60 === null ? null : Number(data.preis_pro_kind_31_60),
    proKindAb61: data.preis_pro_kind_ab_61 === null ? null : Number(data.preis_pro_kind_ab_61),
    hinweis: data.hinweis,
  };
}

/** Verteilt eine Kinderzahl auf die drei Staffelstufen (1.–30., 31.–60., ab 61.). Reine Funktion, gemeinsam
 * genutzt vom Landingpage-Rechner und dem echten Rechnungsvorschlag. */
export function verteileAufStaffel(kinder: number): { stufe1: number; stufe2: number; stufe3: number } {
  const n = Math.max(0, Math.round(kinder));
  const stufe1 = Math.min(n, STAFFEL_GRENZE_1);
  const stufe2 = Math.min(Math.max(n - STAFFEL_GRENZE_1, 0), STAFFEL_GRENZE_2 - STAFFEL_GRENZE_1);
  const stufe3 = Math.max(n - STAFFEL_GRENZE_2, 0);
  return { stufe1, stufe2, stufe3 };
}

export type Monatspreis = { grundgebuehr: number; kinder: number; summe: number };

/** Monatspreis netto: Grundgebühr je Einrichtung plus gestaffelter Preis je Kind — dieselbe Rechnung wie im
 * Rechnungsvorschlag (`berechneRechnungsvorschlag`), nur ohne Einzelpositionen. Auf Cent gerundet. */
export function berechneMonatspreis(einrichtungen: number, kinderProEinrichtung: number, preise: Listenpreise): Monatspreis {
  const anzahlEinrichtungen = Math.max(0, einrichtungen);
  const grund = Math.round((preise.grundgebuehr ?? 0) * anzahlEinrichtungen * 100) / 100;
  const { stufe1, stufe2, stufe3 } = verteileAufStaffel(kinderProEinrichtung);
  const proEinrichtungKinderpreis =
    stufe1 * (preise.proKind1Bis30 ?? 0) + stufe2 * (preise.proKind31Bis60 ?? 0) + stufe3 * (preise.proKindAb61 ?? 0);
  const kinder = Math.round(proEinrichtungKinderpreis * anzahlEinrichtungen * 100) / 100;
  return { grundgebuehr: grund, kinder, summe: Math.round((grund + kinder) * 100) / 100 };
}

export type ListenpreiseInput = {
  grundgebuehr: number | null;
  proKind1Bis30: number | null;
  proKind31Bis60: number | null;
  proKindAb61: number | null;
  hinweis: string | null;
};

/** Deutsche Fehlermeldung oder null. */
export function pruefeListenpreise(input: ListenpreiseInput): string | null {
  for (const [wert, name] of [
    [input.grundgebuehr, "Grundgebühr"],
    [input.proKind1Bis30, "Preis je Kind (1.–30.)"],
    [input.proKind31Bis60, "Preis je Kind (31.–60.)"],
    [input.proKindAb61, "Preis je Kind (ab 61.)"],
  ] as const) {
    if (wert === null) continue;
    if (!Number.isFinite(wert) || wert < 0 || wert > 100000) return `${name}: bitte einen Betrag zwischen 0 und 100.000 € angeben.`;
  }
  if (input.hinweis && input.hinweis.length > 500) return "Der Hinweis darf höchstens 500 Zeichen lang sein.";
  return null;
}
