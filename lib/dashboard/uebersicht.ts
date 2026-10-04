export type UebersichtZeitraum = "kitajahr" | "kalenderjahr";
export type UebersichtModus = "belegung" | "finanzen";

export const UEBERSICHT_MODI: Record<UebersichtModus, { titel: string; erste: string; zweite: string; differenz: string; euro: boolean }> = {
  belegung: { titel: "Belegung", erste: "Belegte Plätze", zweite: "Sollplätze", differenz: "Differenz", euro: false },
  finanzen: { titel: "Finanzen", erste: "Fördererlöse", zweite: "Personalkosten", differenz: "Ergebnis", euro: true },
};

/** Liest die URL-Parameter der Dashboard-Übersicht. Finanzen gibt es nur mit Finanzen-Recht, sonst Belegung. */
export function leseUebersichtParams(
  zeitraum: string | undefined,
  modus: string | undefined,
  finanzenErlaubt: boolean
): { zeitraum: UebersichtZeitraum; modus: UebersichtModus } {
  return {
    zeitraum: zeitraum === "kalenderjahr" ? "kalenderjahr" : "kitajahr",
    modus: modus === "finanzen" && finanzenErlaubt ? "finanzen" : "belegung",
  };
}

/** Erster Monat (ISO, immer der 1.) des gewählten Zeitraums: Kalenderjahr ab Januar, Kitajahr ab dem Startmonat
 * der Einrichtung (z.B. September) des Jahres, in dem wir uns gerade befinden. */
export function uebersichtStartMonat(heute: Date, zeitraum: UebersichtZeitraum, kitaYearStartMonth: number): string {
  const jahr = heute.getUTCFullYear();
  const monat = heute.getUTCMonth() + 1;
  if (zeitraum === "kalenderjahr") return `${jahr}-01-01`;
  const startJahr = monat >= kitaYearStartMonth ? jahr : jahr - 1;
  return `${startJahr}-${String(kitaYearStartMonth).padStart(2, "0")}-01`;
}

export type UebersichtMonat = {
  month: string;
  belegung: { belegteMitI: number; plaetzeNachBetriebserlaubnis: number };
  finanzen?: { foerdererloeseMonat: number; personalkostenMonat: number; ergebnisMonat: number };
};

export type UebersichtPunkt = { label: string; erste: number; zweite: number; differenz: number };

/** Reine Funktion: macht aus den Forecast-Monaten die Diagrammpunkte des gewählten Modus. */
export function baueUebersichtPunkte(monate: UebersichtMonat[], modus: UebersichtModus): UebersichtPunkt[] {
  return monate.map((m) => {
    const label = new Date(`${m.month}T00:00:00Z`).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" });
    if (modus === "finanzen") {
      const f = m.finanzen;
      return { label, erste: f?.foerdererloeseMonat ?? 0, zweite: f?.personalkostenMonat ?? 0, differenz: f?.ergebnisMonat ?? 0 };
    }
    return {
      label,
      erste: m.belegung.belegteMitI,
      zweite: m.belegung.plaetzeNachBetriebserlaubnis,
      differenz: m.belegung.belegteMitI - m.belegung.plaetzeNachBetriebserlaubnis,
    };
  });
}

/** Kopfzahlen über dem Diagramm: Finanzen als Summe über den Zeitraum, Belegung als Durchschnitt (eine "Summe" von
 * Plätzen über Monate wäre sinnlos). */
export function summiereUebersicht(punkte: UebersichtPunkt[], modus: UebersichtModus): { erste: number; zweite: number; differenz: number } {
  if (punkte.length === 0) return { erste: 0, zweite: 0, differenz: 0 };
  const summe = (f: (p: UebersichtPunkt) => number) => punkte.reduce((s, p) => s + f(p), 0);
  const teiler = modus === "belegung" ? punkte.length : 1;
  const runde = (n: number) => (modus === "belegung" ? Math.round((n / teiler) * 10) / 10 : n);
  return { erste: runde(summe((p) => p.erste)), zweite: runde(summe((p) => p.zweite)), differenz: runde(summe((p) => p.differenz)) };
}
