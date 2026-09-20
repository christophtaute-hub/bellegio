import { pruefePasswort } from "@/lib/passwort";

export const BUNDESLAENDER = [
  { code: "by", label: "Bayern" },
  { code: "bw", label: "Baden-Württemberg" },
  { code: "nrw", label: "Nordrhein-Westfalen" },
] as const;

export type BundeslandCode = (typeof BUNDESLAENDER)[number]["code"];

export function istBundeslandCode(wert: string): wert is BundeslandCode {
  return BUNDESLAENDER.some((b) => b.code === wert);
}

export type NeuerKundeInput = {
  traegerName: string;
  einrichtungName: string;
  bundeslandCode: string;
  ort: string | null;
  vollzeitWochenstunden: number;
  adminName: string;
  adminEmail: string;
  /** null = Einladung per E-Mail, sonst sofort nutzbares Passwort. */
  adminPasswort: string | null;
  rechnungsanschrift: string | null;
  rechnungsEmail: string | null;
};

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Gibt eine deutsche Fehlermeldung zurück oder null, wenn alles passt. */
export function pruefeNeuenKunden(input: NeuerKundeInput): string | null {
  if (!input.traegerName.trim()) return "Bitte den Namen des Trägers angeben.";
  if (!input.einrichtungName.trim()) return "Bitte den Namen der ersten Einrichtung angeben.";
  if (!istBundeslandCode(input.bundeslandCode)) return "Bitte ein Bundesland auswählen.";
  if (!(input.vollzeitWochenstunden > 0 && input.vollzeitWochenstunden <= 60)) {
    return "Bitte eine gültige Vollzeit-Wochenstundenzahl (1–60) angeben.";
  }
  if (!input.adminName.trim()) return "Bitte den Namen der Träger-Administration angeben.";
  if (!EMAIL_MUSTER.test(input.adminEmail.trim())) return "Bitte eine gültige E-Mail-Adresse angeben.";
  if (input.rechnungsEmail && !EMAIL_MUSTER.test(input.rechnungsEmail.trim())) {
    return "Bitte eine gültige Rechnungs-E-Mail-Adresse angeben.";
  }
  if (input.adminPasswort) {
    const fehler = pruefePasswort(input.adminPasswort);
    if (fehler) return fehler;
  }
  return null;
}
