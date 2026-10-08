import type { PersonalplanungErgebnis } from "@/lib/team/personalplanung";

export function formatGewichtet(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

/** Der gesetzliche Maßstab in Alltagssprache: eine Zahl („9,3 Kinder je Vollzeitkraft“), die Vorgabe („erlaubt sind 11“) und wie nah man
 * an der Grenze ist (`anteil`: 1 = genau an der Grenze, darüber = Vorgabe verfehlt). */
export type GesetzMassstab = { ist: string; vorgabe: string; anteil: number };

export type PersonalKennzahl = { label: string; value: string; warnt: boolean; trendWert: number; gesetz: GesetzMassstab };

const zahl1 = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ANTEIL_OHNE_PERSONAL = 1.5;

/** Anteil an der gesetzlichen Grenze, wenn „mehr ist besser“ (Stunden, Stellen): Soll geteilt durch Ist. Ohne Personal: deutlich über der Grenze. */
function anteilMindestens(ist: number, soll: number): number {
  if (soll <= 0) return 0;
  return ist > 0 ? soll / ist : ANTEIL_OHNE_PERSONAL;
}

/** Eine Personal-Kennzahl je Bundesland-Modell (Bayern Anstellungsschlüssel, BW VZÄ, NRW Fachkraft-Stunden) — für
 * Dashboard-Kachel und Einrichtungs-Übersicht gleichermaßen, damit beide dieselbe Zahl zeigen. */
export function personalKennzahl(ergebnis: PersonalplanungErgebnis): PersonalKennzahl {
  if (ergebnis.modell === "bayern") {
    const { anstellungsschluessel, mindestschluesselOk, gewichteteKinderzahl, vzaeSoll } = ergebnis.daten;
    const erlaubt = vzaeSoll > 0 ? gewichteteKinderzahl / vzaeSoll : 11;
    return {
      gesetz: {
        ist: anstellungsschluessel !== null ? `${zahl1(anstellungsschluessel)} Kinder je Vollzeitkraft` : "Kein Personal",
        vorgabe: `erlaubt sind ${zahl1(erlaubt)}`,
        anteil: anstellungsschluessel !== null && erlaubt > 0 ? anstellungsschluessel / erlaubt : ANTEIL_OHNE_PERSONAL,
      },
      label: "Anstellungsschlüssel",
      value: anstellungsschluessel !== null ? `1 : ${formatGewichtet(anstellungsschluessel)}` : "–",
      warnt: !mindestschluesselOk,
      trendWert: anstellungsschluessel ?? 0,
    };
  }
  if (ergebnis.modell === "bw") {
    const { istVzaeGesamt, sollVzaeGesamt } = ergebnis.daten;
    return {
      gesetz: {
        ist: `${zahl1(istVzaeGesamt)} Stellen vorhanden`,
        vorgabe: `vorgeschrieben sind ${zahl1(sollVzaeGesamt)}`,
        anteil: anteilMindestens(istVzaeGesamt, sollVzaeGesamt),
      },
      label: "Ist-VZÄ / Soll-VZÄ",
      value: `${formatGewichtet(istVzaeGesamt)} / ${formatGewichtet(sollVzaeGesamt)}`,
      warnt: istVzaeGesamt < sollVzaeGesamt,
      trendWert: istVzaeGesamt,
    };
  }
  const { istFk, sollFachkraftStundenGesamt } = ergebnis.daten;
  return {
    gesetz: {
      ist: `${zahl1(istFk)} Fachkraft-Stunden`,
      vorgabe: `nötig sind ${zahl1(sollFachkraftStundenGesamt)}`,
      anteil: anteilMindestens(istFk, sollFachkraftStundenGesamt),
    },
    label: "Ist-FK / Soll-FK Std.",
    value: `${formatGewichtet(istFk)} / ${formatGewichtet(sollFachkraftStundenGesamt)}`,
    warnt: istFk < sollFachkraftStundenGesamt,
    trendWert: istFk,
  };
}
