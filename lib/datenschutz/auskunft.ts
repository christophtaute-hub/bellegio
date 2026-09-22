import { formatDate } from "@/lib/kita-datum";

/** Bezeichnungen der gespeicherten Felder für den Änderungsverlauf in der Auskunft. Technische Felder
 * (Kennungen, Zeitstempel) tauchen dort nicht auf. */
export const KIND_FELDER: Record<string, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  geburtsdatum: "Geburtsdatum",
  geschlecht: "Geschlecht",
  status: "Status",
  gruppe_id: "Gruppe",
  platznummer: "Platznummer",
  eintritt: "Eintritt",
  austritt: "Austritt",
  vertrag_gueltig_bis: "Vertrag gültig bis",
  buchungszeit_band_id: "Buchungszeit",
  wohnort: "Wohnort",
  hat_behinderung: "I-Status",
  einschulungsstatus: "Einschulungsstatus",
  betriebszugehoerigkeit: "Betriebszugehörigkeit",
  archived_at: "Archiviert am",
};

export const TEAM_FELDER: Record<string, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  rolle: "Rolle",
  role_category: "Kategorie",
  gruppe_id: "Gruppe",
  wochenstunden: "Wochenstunden",
  status: "Status",
  eintritt: "Eintritt",
  austritt: "Austritt",
  fachkraft: "Fachkraft",
  archived_at: "Archiviert am",
};

export type AenderungsZeile = { feld: string; vorher: string; nachher: string };

function anzeigeWert(wert: unknown): string {
  if (wert === null || wert === undefined || wert === "") return "–";
  if (typeof wert === "boolean") return wert ? "Ja" : "Nein";
  if (typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert)) return formatDate(wert);
  return String(wert);
}

/** Welche Felder haben sich zwischen zwei Ständen geändert? Kennungen (…_id) werden über `aufloesen` in lesbare
 * Namen übersetzt (Gruppe, Buchungszeit), sonst als „geändert“ ohne Kennung ausgegeben. */
export function berechneAenderungen(
  alt: Record<string, unknown> | null,
  neu: Record<string, unknown>,
  felder: Record<string, string>,
  aufloesen: (feld: string, wert: unknown) => string | null = () => null
): AenderungsZeile[] {
  const zeilen: AenderungsZeile[] = [];
  for (const [schluessel, label] of Object.entries(felder)) {
    const vorher = alt ? alt[schluessel] : undefined;
    const nachher = neu[schluessel];
    if (alt && vorher === nachher) continue;
    if (!alt && (nachher === null || nachher === undefined || nachher === "")) continue;
    const lesbar = (w: unknown) => (schluessel.endsWith("_id") ? aufloesen(schluessel, w) ?? (w ? "(geändert)" : "–") : anzeigeWert(w));
    zeilen.push({ feld: label, vorher: alt ? lesbar(vorher) : "–", nachher: lesbar(nachher) });
  }
  return zeilen;
}
