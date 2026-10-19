import { AMPEL_TITEL, ampelFarbe, FARBE_LABEL, type MarketingAmpelArt } from "@/lib/marketing/ampel";

type Zeile = Record<string, unknown>;

const AMPEL_FELDER: Record<string, MarketingAmpelArt> = {
  ampel_personalbedarf: "personalbedarf",
  ampel_personelle_qualitaet: "personelle_qualitaet",
  ampel_paedagogische_qualitaet: "paedagogische_qualitaet",
  ampel_belegung: "belegung",
};

const ZAHL_FELDER: Record<string, string> = {
  fehlende_stunden_woche: "Fehlende Stunden pro Woche",
  offene_stellen: "Offene Stellen",
  freie_plaetze_u3: "Freie U3-Plätze",
  freie_plaetze_ue3: "Freie Ü3-Plätze",
  leitung_performance: "Leitungsperformance",
};

const farbWort = (art: MarketingAmpelArt, wert: unknown) => {
  const farbe = typeof wert === "number" ? ampelFarbe(art, wert) : null;
  return farbe ? FARBE_LABEL[farbe] : "nicht bewertet";
};
const text = (wert: unknown) => (wert === null || wert === undefined || wert === "" ? "–" : String(wert));

/** Übersetzt einen Protokolleintrag der Bewertung in lesbare Zeilen („Belegung: Gelb → Rot“). */
export function beschreibeBewertungsAenderung(aktion: string, alt: Zeile | null, neu: Zeile | null, nutzerName: (id: string) => string): string[] {
  if (!neu) return [];
  if (aktion === "INSERT") return ["Erste Bewertung angelegt"];
  const zeilen: string[] = [];
  for (const [feld, art] of Object.entries(AMPEL_FELDER)) {
    if (alt?.[feld] !== neu[feld]) zeilen.push(`${AMPEL_TITEL[art]}: ${farbWort(art, alt?.[feld])} → ${farbWort(art, neu[feld])}`);
  }
  for (const [feld, label] of Object.entries(ZAHL_FELDER)) {
    if (alt?.[feld] !== neu[feld]) zeilen.push(`${label}: ${text(alt?.[feld])} → ${text(neu[feld])}`);
  }
  if (alt?.regionalleitung_user_id !== neu.regionalleitung_user_id) {
    const name = (v: unknown) => (typeof v === "string" ? nutzerName(v) : "–");
    zeilen.push(`Regionalleitung: ${name(alt?.regionalleitung_user_id)} → ${name(neu.regionalleitung_user_id)}`);
  }
  if (alt?.kommentar !== neu.kommentar) zeilen.push("Kommentar geändert");
  return zeilen;
}
