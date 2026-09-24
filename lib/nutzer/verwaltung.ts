import { pruefePasswort } from "@/lib/passwort";

export type NeueRolle = "mitarbeiter" | "einrichtungsleitung";
export type Bereich = "belegung" | "personal" | "controlling" | "szenario";
export type Zugriff = "kein_zugriff" | "ansehen" | "bearbeiten";

export const BEREICHE: { key: Bereich; label: string }[] = [
  { key: "belegung", label: "Belegung" },
  { key: "personal", label: "Personal" },
  { key: "controlling", label: "Controlling" },
  { key: "szenario", label: "Szenario-Rechner" },
];

export const ZUGRIFFE: { value: Zugriff; label: string }[] = [
  { value: "kein_zugriff", label: "Kein Zugriff" },
  { value: "ansehen", label: "Ansehen" },
  { value: "bearbeiten", label: "Bearbeiten" },
];

/** Spiegelt app.zugriff_rang() aus der RLS — für Kappungs-Prüfungen im Anwendungscode (die
 * eigentliche Durchsetzung passiert weiterhin in der Datenbank). */
export function zugriffRang(zugriff: Zugriff): number {
  return zugriff === "bearbeiten" ? 2 : zugriff === "ansehen" ? 1 : 0;
}

export const ROLLEN: { value: NeueRolle; label: string; hinweis: string }[] = [
  { value: "mitarbeiter", label: "Mitarbeiter", hinweis: "Sieht und bearbeitet nur, was du unten je Einrichtung und Bereich freigibst." },
  {
    value: "einrichtungsleitung",
    label: "Einrichtungsleitung",
    hinweis: "Bearbeitet alle Bereiche aller Einrichtungen. Verwaltet keine Nutzer und sieht keine Abrechnung.",
  },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NeuerNutzerInput = {
  email: string;
  name: string;
  /** null = Einladung per E-Mail, sonst sofort nutzbares Passwort. */
  passwort: string | null;
  rolle: NeueRolle;
  /** Einrichtungen, für die die Bereichsrechte gelten (nur bei Rolle Mitarbeiter). */
  einrichtungIds: string[];
  rechte: Record<Bereich, Zugriff>;
};

/** Deutsche Fehlermeldung oder null. */
export function pruefeNeuenNutzer(input: NeuerNutzerInput): string | null {
  if (!input.name.trim()) return "Bitte den Namen angeben.";
  if (!EMAIL.test(input.email.trim())) return "Bitte eine gültige E-Mail-Adresse angeben.";
  if (input.passwort !== null) {
    const fehler = pruefePasswort(input.passwort);
    if (fehler) return fehler;
  }
  if (input.rolle !== "mitarbeiter" && input.rolle !== "einrichtungsleitung") return "Bitte eine Rolle wählen.";
  for (const b of BEREICHE) {
    if (!ZUGRIFFE.some((z) => z.value === input.rechte[b.key])) return "Bitte für jeden Bereich eine Stufe wählen.";
  }
  return null;
}

export type Beteiligter = { id: string; rolle: string; tragerId: string };
export type Verwaltungsaktion = "passwort" | "loeschen" | "rolle" | "sperren";

/** Darf der Aufrufer diese Aktion am Ziel-Nutzer ausführen? Die Aktionen laufen mit erhöhten Rechten (Service-Role) —
 * diese Prüfung ist deshalb die eigentliche Sperre und gilt vor jedem Zugriff. */
export function darfNutzerVerwalten(aufrufer: Beteiligter, ziel: Beteiligter, aktion: Verwaltungsaktion): string | null {
  if (aufrufer.rolle !== "traeger_admin") return "Nur die Träger-Administration darf Nutzer verwalten.";
  if (aufrufer.tragerId !== ziel.tragerId) return "Dieser Nutzer gehört nicht zu deinem Träger.";
  if (ziel.rolle === "traeger_admin") {
    return aktion === "passwort"
      ? "Das Passwort eines Träger-Administrators änderst du unter „Mein Profil“."
      : "Träger-Administratoren lassen sich hier nicht ändern, sperren oder löschen.";
  }
  return null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Zufälliges, gut tippbares Passwort (ohne verwechselbare Zeichen wie 0/O oder 1/l/I). */
export function erzeugePasswort(laenge = 14): string {
  const bytes = new Uint32Array(laenge);
  globalThis.crypto.getRandomValues(bytes);
  let passwort = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  // Mindestens eine Ziffer und je ein Groß-/Kleinbuchstabe — sonst würfeln wir neu.
  if (!/[0-9]/.test(passwort) || !/[a-z]/.test(passwort) || !/[A-Z]/.test(passwort)) passwort = erzeugePasswort(laenge);
  return passwort;
}
