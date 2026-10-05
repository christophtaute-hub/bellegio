import type { Ampel } from "@/lib/team/anstellungsschluessel";

/** Eine Quelle für die Wörter, mit denen die App Zustände benennt — überall gleich, so einfach, dass es ein Kind versteht.
 * Grün heißt immer „In Ordnung“. */
export const PERSONAL_STATUS: Record<Ampel, string> = {
  gruen: "In Ordnung",
  gelb: "Knapp",
  rot: "Zu wenig Personal",
};

export const UEBERHANG_STATUS = "Mehr Personal als nötig";

/** Allgemeine Ampel-Wörter (wenn es nicht speziell um Personal geht). */
export const AMPEL_STATUS: Record<Ampel, string> = {
  gruen: "In Ordnung",
  gelb: "Knapp",
  rot: "Handeln",
};

export function belegungStatus(belegt: number, plaetze: number): { wort: string; ton: "ok" | "voll" | "frei" | "zuviel" } {
  if (belegt > plaetze) return { wort: "Überbelegt", ton: "zuviel" };
  if (belegt === plaetze) return { wort: "Voll", ton: "voll" };
  return { wort: plaetze - belegt === 1 ? "1 Platz frei" : `${plaetze - belegt} Plätze frei`, ton: "frei" };
}

const zahl = (wert: number, stellen = 1) => wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/** Wochenstunden als Stellenanteil in Worten: „eine halbe Stelle“, „etwa 1,5 Stellen“. */
export function stellenText(wochenstunden: number, vollzeitWochenstunden: number): string {
  const stellen = vollzeitWochenstunden > 0 ? wochenstunden / vollzeitWochenstunden : 0;
  const viertel = Math.max(1, Math.round(stellen * 4));
  const gerundet = viertel / 4;
  const woerter: Record<number, string> = { 1: "eine Viertelstelle", 2: "eine halbe Stelle", 3: "eine Dreiviertelstelle", 4: "eine ganze Stelle" };
  return viertel in woerter ? `etwa ${woerter[viertel]}` : `etwa ${zahl(gerundet, gerundet % 1 === 0 ? 0 : 2).replace(/0$/, "")} Stellen`;
}
