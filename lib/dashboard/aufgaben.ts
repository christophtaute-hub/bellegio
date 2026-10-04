import type { Ampel } from "@/lib/team/anstellungsschluessel";

export type AufgabenGruppe = "Belegung" | "Personal" | "Daten";
export type Aufgabe = {
  id: string;
  gruppe: AufgabenGruppe;
  text: string;
  ton: "warn" | "info";
  href: string;
};

export type AufgabenEingabe = {
  /** Belegt minus Sollplätze (positiv = überbelegt). */
  ueberbelegung: number;
  freiePlaetze: number;
  nachrueckerOffen: number;
  /** Aktive Kinder mit Austritt in den nächsten 3 Monaten. */
  austritteBald: number;
  kinderOhneBuchungszeit: number;
  personalAmpel: Ampel;
  personalText: string;
  /** null = kein Finanzen-Recht, es wird nichts dazu angezeigt. */
  verguetungFehlt: number | null;
  /** Nur BW: ohne manuellen Förderbetrag bleiben die Fördererlöse 0 €. null = nicht relevant bzw. kein Recht. */
  foerderbetragFehlt: boolean | null;
};

const mehrzahl = (n: number, einzahl: string, plural: string) => (n === 1 ? einzahl : plural);

/** Reine Funktion: baut aus bereits berechneten Kennzahlen die Aufgabenliste des Dashboards ("Was braucht
 * Aufmerksamkeit?"). Warnungen stehen vor Hinweisen, innerhalb davon bleibt die Reihenfolge Belegung, Personal, Daten. */
export function baueAufgaben(e: AufgabenEingabe): Aufgabe[] {
  const liste: Aufgabe[] = [];

  if (e.ueberbelegung > 0) {
    liste.push({
      id: "ueberbelegung",
      gruppe: "Belegung",
      ton: "warn",
      text: `${e.ueberbelegung} ${mehrzahl(e.ueberbelegung, "Kind", "Kinder")} mehr als Sollplätze`,
      href: "/gruppen",
    });
  }
  if (e.nachrueckerOffen > 0) {
    liste.push({
      id: "nachruecker",
      gruppe: "Belegung",
      ton: "info",
      text:
        e.freiePlaetze > 0
          ? `${e.freiePlaetze} ${mehrzahl(e.freiePlaetze, "freier Platz", "freie Plätze")}, ${e.nachrueckerOffen} ${mehrzahl(e.nachrueckerOffen, "Nachrücker wartet", "Nachrücker warten")}`
          : `${e.nachrueckerOffen} ${mehrzahl(e.nachrueckerOffen, "Nachrücker wartet", "Nachrücker warten")}, aktuell kein freier Platz`,
      href: "/gruppen/vorschau",
    });
  }
  if (e.austritteBald > 0) {
    liste.push({
      id: "austritte",
      gruppe: "Belegung",
      ton: "info",
      text: `${e.austritteBald} ${mehrzahl(e.austritteBald, "Kind verlässt", "Kinder verlassen")} die Einrichtung in den nächsten 3 Monaten`,
      href: "/gruppen/vorschau",
    });
  }

  if (e.personalAmpel === "rot") {
    liste.push({ id: "personal", gruppe: "Personal", ton: "warn", text: `Personal: ${e.personalText} — Soll nicht erfüllt`, href: "/team" });
  } else if (e.personalAmpel === "gelb") {
    liste.push({ id: "personal", gruppe: "Personal", ton: "info", text: `Personal: ${e.personalText} — knapp am Limit`, href: "/team" });
  }

  if (e.kinderOhneBuchungszeit > 0) {
    liste.push({
      id: "ohne-buchungszeit",
      gruppe: "Daten",
      ton: "warn",
      text: `${e.kinderOhneBuchungszeit} ${mehrzahl(e.kinderOhneBuchungszeit, "Kind", "Kinder")} ohne Buchungszeit`,
      href: "/kinder",
    });
  }
  if (e.verguetungFehlt !== null && e.verguetungFehlt > 0) {
    liste.push({
      id: "verguetung",
      gruppe: "Daten",
      ton: "warn",
      text: `${e.verguetungFehlt} ${mehrzahl(e.verguetungFehlt, "Mitarbeiter:in", "Mitarbeitende")} ohne Vergütung — fehlt in den Personalkosten`,
      href: "/team",
    });
  }
  if (e.foerderbetragFehlt) {
    liste.push({
      id: "foerderbetrag",
      gruppe: "Daten",
      ton: "warn",
      text: "Kein Förderbetrag hinterlegt — die Fördererlöse bleiben 0 €",
      href: "/einstellungen",
    });
  }

  return [...liste.filter((a) => a.ton === "warn"), ...liste.filter((a) => a.ton === "info")];
}
