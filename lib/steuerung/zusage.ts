import type { Ampel } from "@/lib/team/anstellungsschluessel";
import type { GruppenVerlauf } from "@/lib/steuerung/handlungen";

export type Zusage = {
  /** ja = Platz da und Personal reicht · spaeter = Platz erst später frei · personal = Platz da, aber das Personal reicht dann nicht · nein = kein Platz in Sicht */
  art: "ja" | "spaeter" | "personal" | "nein";
  text: string;
  /** Erster Monat, ab dem ein Platz frei ist (YYYY-MM-01). */
  ab: string | null;
};

function monatLang(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** „Kann ich einem Kind zusagen?“ je Gruppe: braucht einen freien Platz **und** ausreichend Personal in diesem Monat.
 * Bayern kennt den Schlüssel gesetzlich nur für die Einrichtung (dort zählt deren Ampel); BW und NRW rechnen je Gruppe, solange
 * das Personal den Gruppen zugeordnet ist. */
export function bewerteZusage(g: GruppenVerlauf, einrichtungAmpel: Record<string, Ampel>, stichtagMonat: string): Zusage {
  const personalReicht = (monat: string): boolean => {
    const ampel =
      g.modell === "bayern" || !g.belastbar ? einrichtungAmpel[monat] : g.monate.find((m) => m.monat === monat)?.ampel ?? einrichtungAmpel[monat];
    return ampel !== "rot";
  };

  const platzMonat = g.monate.find((m) => m.monat >= stichtagMonat && m.sollplaetze - m.belegt > 0);
  if (!platzMonat) return { art: "nein", text: "Voll — kein Platz in Sicht", ab: null };

  const frei = platzMonat.sollplaetze - platzMonat.belegt;
  const jetzt = platzMonat.monat === stichtagMonat;
  const reicht = personalReicht(platzMonat.monat);
  const platzText = jetzt ? (frei === 1 ? "1 Platz frei" : `${frei} Plätze frei`) : `Ab ${monatLang(platzMonat.monat)} ein Platz frei`;

  if (!reicht) return { art: "personal", text: `${platzText}, aber das Personal fehlt`, ab: platzMonat.monat };
  return jetzt
    ? { art: "ja", text: `Ja — ${platzText}`, ab: platzMonat.monat }
    : { art: "spaeter", text: `Später — ${platzText}`, ab: platzMonat.monat };
}
