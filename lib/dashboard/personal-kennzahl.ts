import type { PersonalplanungErgebnis } from "@/lib/team/personalplanung";

export function formatGewichtet(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export type PersonalKennzahl = { label: string; value: string; warnt: boolean; trendWert: number };

/** Eine Personal-Kennzahl je Bundesland-Modell (Bayern Anstellungsschlüssel, BW VZÄ, NRW Fachkraft-Stunden) — für
 * Dashboard-Kachel und Einrichtungs-Übersicht gleichermaßen, damit beide dieselbe Zahl zeigen. */
export function personalKennzahl(ergebnis: PersonalplanungErgebnis): PersonalKennzahl {
  if (ergebnis.modell === "bayern") {
    const { anstellungsschluessel, mindestschluesselOk } = ergebnis.daten;
    return {
      label: "Anstellungsschlüssel",
      value: anstellungsschluessel !== null ? `1 : ${formatGewichtet(anstellungsschluessel)}` : "–",
      warnt: !mindestschluesselOk,
      trendWert: anstellungsschluessel ?? 0,
    };
  }
  if (ergebnis.modell === "bw") {
    const { istVzaeGesamt, sollVzaeGesamt } = ergebnis.daten;
    return {
      label: "Ist-VZÄ / Soll-VZÄ",
      value: `${formatGewichtet(istVzaeGesamt)} / ${formatGewichtet(sollVzaeGesamt)}`,
      warnt: istVzaeGesamt < sollVzaeGesamt,
      trendWert: istVzaeGesamt,
    };
  }
  const { istFk, sollFachkraftStundenGesamt } = ergebnis.daten;
  return {
    label: "Ist-FK / Soll-FK Std.",
    value: `${formatGewichtet(istFk)} / ${formatGewichtet(sollFachkraftStundenGesamt)}`,
    warnt: istFk < sollFachkraftStundenGesamt,
    trendWert: istFk,
  };
}
