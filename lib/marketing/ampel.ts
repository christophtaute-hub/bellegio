/** Die vier Marketing-Ampeln. Personalbedarf und Belegung haben vier Stufen (0 Grün, 1 Gelb, 2 Orange, 3 Rot), die beiden
 * Qualitäts-Ampeln drei (0 Grün, 1 Gelb, 2 Rot). Unbewertet = null. */
export type MarketingAmpelArt = "personalbedarf" | "personelle_qualitaet" | "paedagogische_qualitaet" | "belegung";

export const AMPEL_ARTEN: MarketingAmpelArt[] = ["personalbedarf", "personelle_qualitaet", "paedagogische_qualitaet", "belegung"];

export const AMPEL_TITEL: Record<MarketingAmpelArt, string> = {
  personalbedarf: "Personalbedarf",
  personelle_qualitaet: "Personelle Qualität",
  paedagogische_qualitaet: "Pädagogische Qualität",
  belegung: "Belegung",
};

export const MAX_STUFE: Record<MarketingAmpelArt, number> = { personalbedarf: 3, personelle_qualitaet: 2, paedagogische_qualitaet: 2, belegung: 3 };

export type AmpelFarbe = "gruen" | "gelb" | "orange" | "rot";

export function ampelFarbe(art: MarketingAmpelArt, stufe: number | null): AmpelFarbe | null {
  if (stufe === null || stufe === undefined) return null;
  if (stufe <= 0) return "gruen";
  if (stufe === 1) return "gelb";
  if (MAX_STUFE[art] === 3) return stufe === 2 ? "orange" : "rot";
  return "rot";
}

export const FARBE_LABEL: Record<AmpelFarbe, string> = { gruen: "Grün", gelb: "Gelb", orange: "Orange", rot: "Rot" };

/** Verfügbare Stufen einer Ampel mit Farbe und Wort (für den Schalter). */
export function ampelStufen(art: MarketingAmpelArt): { stufe: number; farbe: AmpelFarbe; label: string }[] {
  return Array.from({ length: MAX_STUFE[art] + 1 }, (_, stufe) => {
    const farbe = ampelFarbe(art, stufe) as AmpelFarbe;
    return { stufe, farbe, label: FARBE_LABEL[farbe] };
  });
}

/** Orange oder Rot — hier ist Handeln nötig. */
export function istKritisch(art: MarketingAmpelArt, stufe: number | null): boolean {
  const farbe = ampelFarbe(art, stufe);
  return farbe === "orange" || farbe === "rot";
}

/** Schweregrad 0–3 zum Sortieren (Qualitäts-Rot zählt wie Rot). Unbewertet = -1. */
export function schweregrad(art: MarketingAmpelArt, stufe: number | null): number {
  const farbe = ampelFarbe(art, stufe);
  return farbe === null ? -1 : { gruen: 0, gelb: 1, orange: 2, rot: 3 }[farbe];
}

/** Standard-Grenzwerte für den Vorschlag aus Bellegio-Daten: Untergrenzen für Gelb, Orange und Rot. Später je Träger
 * einstellbar. Personalbedarf nach fehlenden Wochenstunden (ab 40 ≈ eine Vollzeitstelle), Belegung nach freien Plätzen. */
export const STANDARD_GRENZEN: Record<"personalbedarf" | "belegung", [number, number, number]> = {
  personalbedarf: [1, 20, 40],
  belegung: [2, 4, 7],
};

/** Stufe 0–3 aus einem Wert und den drei Untergrenzen. */
export function stufeAusGrenzen(wert: number, grenzen: [number, number, number]): number {
  if (wert >= grenzen[2]) return 3;
  if (wert >= grenzen[1]) return 2;
  if (wert >= grenzen[0]) return 1;
  return 0;
}

/** Standard-Kriterien als Tooltip je Ampel und Stufe (später je Träger anpassbar). */
export const STANDARD_KRITERIEN: Record<MarketingAmpelArt, string[]> = {
  personalbedarf: ["Besetzt, kein Bedarf", "Kleiner Bedarf (unter 20 Std./Woche fehlen)", "Deutlicher Bedarf (20–39 Std./Woche fehlen)", "Dringend (ab 40 Std./Woche, etwa eine Vollzeitstelle)"],
  personelle_qualitaet: ["Stabiles, gutes Team und starke Leitung", "Auffälligkeiten (Fluktuation, Leitung unsicher)", "Kritisch (Leitung oder Team gefährden den Betrieb)"],
  paedagogische_qualitaet: ["Keine Auffälligkeiten", "Einzelne Qualitätsthemen", "Ernste Qualitätsprobleme"],
  belegung: ["Voll belegt, nichts absehbar", "Einzelne Plätze frei (2–3)", "Mehrere Plätze frei (4–6)", "Viele Plätze frei (ab 7) — dringend Kinder nötig"],
};
