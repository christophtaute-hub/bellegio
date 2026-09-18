import { calculateAgeYears } from "@/lib/kita-datum";

/**
 * Rein beratende Einschätzung, wie gut ein Nachrücker-Kind (nach Alter und
 * Geschlecht) zu einer Gruppe passen würde — keine Sperre, nur eine
 * Empfehlung beim Anlegen/Zuordnen. Bewusst bundeslandneutral auf
 * `gruppenart` gestützt (einziges Feld, das in Bayern/BW/NRW gleichermaßen
 * gepflegt wird), nicht auf die bundeslandspezifischen Buchungszeit-/
 * Gruppenform-Felder.
 */

const ALTERSSPANNE: Record<string, [number, number]> = {
  krippe: [0, 3],
  kindergarten: [3, 6],
  hort: [6, 10],
  altersgemischt: [0, 6],
};

const ALTERSSPANNE_STANDARD: [number, number] = [0, 10];

/** 100 innerhalb der erwarteten Altersspanne der Gruppenart, sonst linear
 * abfallend (ab ca. 2,5 Jahre außerhalb der Spanne auf 0). */
export function berechneAltersScore(alterJahre: number, gruppenart: string): number {
  const [min, max] = ALTERSSPANNE[gruppenart] ?? ALTERSSPANNE_STANDARD;
  if (alterJahre >= min && alterJahre <= max) return 100;
  const abstand = alterJahre < min ? min - alterJahre : alterJahre - max;
  return Math.max(0, Math.round(100 - abstand * 40));
}

/** Je kleiner der Anteil des eigenen Geschlechts unter den aktiven Kindern
 * der Gruppe, desto mehr verbessert dieses Kind die Balance. Ohne aktive
 * Kinder oder ohne verwertbare Geschlechtsangabe: neutraler Wert. */
export function berechneGeschlechterScore(
  geschlecht: string,
  aktiveKinder: { geschlecht: string }[]
): number {
  if (geschlecht === "keine_angabe" || aktiveKinder.length === 0) return 75;
  const anzahlGleich = aktiveKinder.filter((k) => k.geschlecht === geschlecht).length;
  const anteilGleich = anzahlGleich / aktiveKinder.length;
  return Math.round(100 - anteilGleich * 50);
}

export type GruppenPassungKind = {
  geburtsdatum: string;
  geschlecht: string;
};

export type GruppeFuerPassung = {
  id: string;
  name: string;
  gruppenart: string;
  sollplatze: number;
  aktiveKinder: { geschlecht: string }[];
};

export type PassungsEinschaetzung = "gut" | "bedingt" | "schlecht";

export type PassungsErgebnis = {
  gruppeId: string;
  gruppeName: string;
  score: number;
  einschaetzung: PassungsEinschaetzung;
  freiePlaetze: number;
  altersHinweis: string;
  hatFreienPlatz: boolean;
};

function einschaetzungFuerScore(score: number): PassungsEinschaetzung {
  if (score >= 80) return "gut";
  if (score >= 50) return "bedingt";
  return "schlecht";
}

export function bewertePassung(
  kind: GruppenPassungKind,
  gruppe: GruppeFuerPassung,
  heute = new Date()
): PassungsErgebnis {
  const alter = calculateAgeYears(kind.geburtsdatum, heute);
  const altersScore = berechneAltersScore(alter, gruppe.gruppenart);
  const geschlechterScore = berechneGeschlechterScore(kind.geschlecht, gruppe.aktiveKinder);
  const score = Math.round(altersScore * 0.8 + geschlechterScore * 0.2);

  const [min, max] = ALTERSSPANNE[gruppe.gruppenart] ?? ALTERSSPANNE_STANDARD;
  const alterFormatiert = alter.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const altersHinweis =
    alter >= min && alter <= max
      ? `Alter (${alterFormatiert} Jahre) passt zur üblichen Spanne dieser Gruppenart (${min}–${max} Jahre).`
      : `Alter (${alterFormatiert} Jahre) liegt außerhalb der üblichen Spanne dieser Gruppenart (${min}–${max} Jahre).`;

  const freiePlaetze = gruppe.sollplatze - gruppe.aktiveKinder.length;

  return {
    gruppeId: gruppe.id,
    gruppeName: gruppe.name,
    score,
    einschaetzung: einschaetzungFuerScore(score),
    freiePlaetze,
    altersHinweis,
    hatFreienPlatz: freiePlaetze > 0,
  };
}

/** Alle Gruppen der Einrichtung, absteigend nach Passung sortiert — Gruppen
 * mit freiem Platz zuerst, danach nach Score. */
export function empfehleGruppen(
  kind: GruppenPassungKind,
  gruppen: GruppeFuerPassung[],
  heute = new Date()
): PassungsErgebnis[] {
  return gruppen
    .map((g) => bewertePassung(kind, g, heute))
    .sort((a, b) => {
      if (a.hatFreienPlatz !== b.hatFreienPlatz) return a.hatFreienPlatz ? -1 : 1;
      return b.score - a.score;
    });
}
