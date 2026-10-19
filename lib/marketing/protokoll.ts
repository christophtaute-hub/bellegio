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

const KAMPAGNE_FELDER: Record<string, string> = {
  status: "Status",
  budget: "Budget",
  kosten: "Kosten",
  beginn: "Beginn",
  ende: "Ende",
  beworbenes: "Beworbenes",
  naechster_schritt: "Nächster Schritt",
  schritt_faellig: "Schritt fällig",
};
const STATUS_WORT: Record<string, string> = { geplant: "Geplant", aktiv: "Aktiv", pausiert: "Pausiert", beendet: "Beendet" };
const KANAL_WORT: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", sonstige: "Sonstiges" };

/** Protokollzeilen einer Kampagne („Kampagne ‚Meta Ads · 6 Ü3-Plätze‘: Status Geplant → Aktiv“). */
export function beschreibeKampagnenAenderung(aktion: string, alt: Zeile | null, neu: Zeile | null): string[] {
  if (!neu) return [];
  const titel = `${KANAL_WORT[String(neu.kanal)] ?? String(neu.kanal)} · ${String(neu.beworbenes)}`;
  if (aktion === "INSERT") return [`Kampagne angelegt: ${titel}`];
  const wert = (feld: string, v: unknown) => (feld === "status" ? (STATUS_WORT[String(v)] ?? String(v)) : text(v));
  const zeilen: string[] = [];
  for (const [feld, label] of Object.entries(KAMPAGNE_FELDER)) {
    if (alt?.[feld] !== neu[feld]) zeilen.push(`Kampagne „${titel}“: ${label} ${wert(feld, alt?.[feld])} → ${wert(feld, neu[feld])}`);
  }
  if (JSON.stringify(alt?.links) !== JSON.stringify(neu.links) || alt?.kommentar !== neu.kommentar || alt?.verantwortlich_user_id !== neu.verantwortlich_user_id || alt?.kanal !== neu.kanal || alt?.art !== neu.art || alt?.anzahl !== neu.anzahl) {
    zeilen.push(`Kampagne „${titel}“: weitere Angaben geändert`);
  }
  return zeilen;
}
