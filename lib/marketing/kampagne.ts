export type KampagneArt = "personal" | "belegung";
export type KampagneKanal = "meta" | "google" | "sonstige";
export type KampagneStatus = "geplant" | "aktiv" | "pausiert" | "beendet";

export const ART_LABEL: Record<KampagneArt, string> = { personal: "Personalmarketing", belegung: "Belegungsmarketing" };
export const KANAL_LABEL: Record<KampagneKanal, string> = { meta: "Meta Ads", google: "Google Ads", sonstige: "Sonstiges" };
export const STATUS_LABEL: Record<KampagneStatus, string> = { geplant: "Geplant", aktiv: "Aktiv", pausiert: "Pausiert", beendet: "Beendet" };
export const STATUS_REIHENFOLGE: KampagneStatus[] = ["aktiv", "geplant", "pausiert", "beendet"];

export type Kampagne = {
  id: string;
  einrichtungId: string;
  art: KampagneArt;
  kanal: KampagneKanal;
  beworbenes: string;
  anzahl: number | null;
  beginn: string | null;
  ende: string | null;
  status: KampagneStatus;
  budget: number | null;
  kosten: number | null;
  links: string[];
  verantwortlichUserId: string | null;
  kommentar: string | null;
  naechsterSchritt: string | null;
  schrittFaellig: string | null;
};

/** Zeilen eines Textfelds → gültige Links (nur http/https), ohne Leerzeilen und Dubletten. Der zweite Wert sind ungültige Zeilen. */
export function parseLinks(text: string): { links: string[]; ungueltig: string[] } {
  const links: string[] = [];
  const ungueltig: string[] = [];
  for (const zeile of text.split(/\r?\n/).map((z) => z.trim()).filter(Boolean)) {
    try {
      const url = new URL(zeile);
      if (url.protocol === "http:" || url.protocol === "https:") {
        if (!links.includes(url.toString())) links.push(url.toString());
        continue;
      }
    } catch {
      // ungültig
    }
    ungueltig.push(zeile);
  }
  return { links, ungueltig };
}

/** Tage von `heute` bis `datum` (negativ = vorbei). Beide als YYYY-MM-DD. */
export function tageBis(datum: string, heute: string): number {
  return Math.round((Date.parse(`${datum}T00:00:00Z`) - Date.parse(`${heute}T00:00:00Z`)) / 86_400_000);
}

/** Läuft die aktive Kampagne in den nächsten `tage` Tagen aus (einschließlich heute)? */
export function endetBald(k: Pick<Kampagne, "status" | "ende">, heute: string, tage: number): boolean {
  if (k.status !== "aktiv" || !k.ende) return false;
  const rest = tageBis(k.ende, heute);
  return rest >= 0 && rest <= tage;
}

/** Aktive Kampagne, deren Ende schon vorbei ist, oder geplante, deren Beginn schon vorbei ist — hier fehlt eine Statuspflege. */
export function istUeberfaellig(k: Pick<Kampagne, "status" | "ende" | "beginn" | "schrittFaellig">, heute: string): boolean {
  if (k.status === "beendet") return false;
  if (k.status === "aktiv" && k.ende && tageBis(k.ende, heute) < 0) return true;
  if (k.status === "geplant" && k.beginn && tageBis(k.beginn, heute) < 0) return true;
  return Boolean(k.schrittFaellig && tageBis(k.schrittFaellig, heute) < 0);
}

/** Läuft oder ist geplant (zählt als „Maßnahme vorhanden“). */
export function istLaufendOderGeplant(k: Pick<Kampagne, "status">): boolean {
  return k.status === "aktiv" || k.status === "geplant" || k.status === "pausiert";
}

export function summiere(kampagnen: Pick<Kampagne, "budget" | "kosten">[]): { budget: number; kosten: number } {
  return kampagnen.reduce<{ budget: number; kosten: number }>((s, k) => ({ budget: s.budget + (k.budget ?? 0), kosten: s.kosten + (k.kosten ?? 0) }), { budget: 0, kosten: 0 });
}
