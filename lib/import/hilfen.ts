/** Reine Hilfsfunktionen für den Import aus Excel/CSV — ohne Datenbank- oder Browser-Zugriff,
 * damit sie sich einfach testen lassen. */

export type RohWert = string | number | boolean | null | undefined;
export type RohZeile = Record<string, RohWert>;

/** Kleinschreibung, ohne Umlaute/Akzente, Satzzeichen zu Leerzeichen — für den Vergleich von Überschriften und Werten. */
export function normalisiere(wert: unknown): string {
  return String(wert ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function textWert(wert: RohWert): string {
  if (wert === null || wert === undefined) return "";
  return String(wert).trim();
}

function istEchtesDatum(jahr: number, monat: number, tag: number): boolean {
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  return d.getUTCFullYear() === jahr && d.getUTCMonth() === monat - 1 && d.getUTCDate() === tag;
}

function iso(jahr: number, monat: number, tag: number): string {
  return `${String(jahr).padStart(4, "0")}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

export type DatumErgebnis = { iso: string | null; fehler: string | null };

/** Akzeptiert Excel-Seriennummern, JJJJ-MM-TT sowie TT.MM.JJJJ / TT.MM.JJ / TT/MM/JJJJ / TT-MM-JJJJ.
 * Leer ist erlaubt (iso = null, kein Fehler). */
export function parseDatum(wert: RohWert): DatumErgebnis {
  if (wert === null || wert === undefined || wert === "") return { iso: null, fehler: null };

  if (typeof wert === "number") {
    if (wert > 20000 && wert < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(wert) * 86_400_000);
      return { iso: iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), fehler: null };
    }
    return { iso: null, fehler: `„${wert}“ ist kein gültiges Datum.` };
  }

  const text = String(wert).trim();
  if (!text) return { iso: null, fehler: null };

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  if (isoMatch) {
    const [j, m, t] = [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])];
    return istEchtesDatum(j, m, t)
      ? { iso: iso(j, m, t), fehler: null }
      : { iso: null, fehler: `„${text}“ ist kein gültiges Datum.` };
  }

  const deMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(text);
  if (deMatch) {
    const [t, m] = [Number(deMatch[1]), Number(deMatch[2])];
    let j = Number(deMatch[3]);
    if (deMatch[3].length === 2) j += j <= 40 ? 2000 : 1900;
    return istEchtesDatum(j, m, t)
      ? { iso: iso(j, m, t), fehler: null }
      : { iso: null, fehler: `„${text}“ ist kein gültiges Datum.` };
  }

  return { iso: null, fehler: `„${text}“ ist kein gültiges Datum (erwartet: TT.MM.JJJJ).` };
}

/** ja/nein-Werte. null = nicht erkannt. Leer zählt als „nein“. */
export function parseJaNein(wert: RohWert): boolean | null {
  if (typeof wert === "boolean") return wert;
  if (typeof wert === "number") return wert === 1 ? true : wert === 0 ? false : null;
  const t = normalisiere(wert);
  if (t === "") return false;
  if (["ja", "j", "x", "1", "true", "yes", "y", "i", "wahr"].includes(t)) return true;
  if (["nein", "n", "0", "false", "no", "falsch", "-"].includes(t)) return false;
  return null;
}

/** Kommazahlen („37,5“) und Punktzahlen; null = nicht erkannt oder leer. */
export function parseZahl(wert: RohWert): number | null {
  if (typeof wert === "number") return Number.isFinite(wert) ? wert : null;
  const t = textWert(wert).replace(/\s/g, "").replace(",", ".");
  if (t === "" || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Vereinheitlicht Buchungszeit-Angaben für den Vergleich: „6 bis 7 Std.“, „6–7h“ und „6-7h“ werden gleich. */
export function normalisiereBand(wert: unknown): string {
  return String(wert ?? "")
    .toLowerCase()
    .replace(/ü/g, "ue")
    .replace(/[–—]/g, "-")
    .replace(/>/g, "ueber")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .replace(/bis/g, "-")
    .replace(/wochenstunden|stunden|std\.?|h/g, "");
}

export type SpaltenSynonyme<F extends string> = Record<F, string[]>;

/** Ordnet Überschriften der Datei den erwarteten Feldern zu (Vergleich ohne Groß-/Kleinschreibung, Umlaute, Satzzeichen). */
export function findeSpalten<F extends string>(
  ueberschriften: string[],
  synonyme: SpaltenSynonyme<F>
): Record<F, string | null> {
  const ergebnis = {} as Record<F, string | null>;
  const normalisiert = ueberschriften.map((u) => ({ original: u, norm: normalisiere(u) }));
  for (const feld of Object.keys(synonyme) as F[]) {
    const treffer = normalisiert.find((u) => synonyme[feld].some((s) => normalisiere(s) === u.norm));
    ergebnis[feld] = treffer?.original ?? null;
  }
  return ergebnis;
}

/** Sucht in den ersten Zeilen einer Tabelle die Kopfzeile (die mit den meisten bekannten Überschriften) und
 * wandelt die Zeilen darunter in Objekte um. Leere Zeilen werden übersprungen. */
export function zeilenAusMatrix<F extends string>(
  matrix: RohWert[][],
  synonyme: SpaltenSynonyme<F>
): { zeilen: RohZeile[]; kopfzeile: number } {
  let beste = { index: 0, treffer: -1 };
  matrix.slice(0, 15).forEach((zeile, index) => {
    const ueberschriften = zeile.map((z) => textWert(z)).filter(Boolean);
    const zuordnung = findeSpalten(ueberschriften, synonyme);
    const treffer = Object.values(zuordnung).filter(Boolean).length;
    if (treffer > beste.treffer) beste = { index, treffer };
  });

  const kopf = (matrix[beste.index] ?? []).map((z) => textWert(z));
  const zeilen: RohZeile[] = [];
  for (const zeile of matrix.slice(beste.index + 1)) {
    const objekt: RohZeile = {};
    let hatInhalt = false;
    kopf.forEach((name, i) => {
      if (!name) return;
      const wert = zeile[i] ?? null;
      objekt[name] = wert;
      if (textWert(wert) !== "") hatInhalt = true;
    });
    if (hatInhalt) zeilen.push(objekt);
  }
  return { zeilen, kopfzeile: beste.index + 1 };
}

export function alterInJahren(geburtsdatum: string, stichtag: string): number {
  const [gj, gm, gt] = geburtsdatum.split("-").map(Number);
  const [sj, sm, st] = stichtag.split("-").map(Number);
  let alter = sj - gj;
  if (sm < gm || (sm === gm && st < gt)) alter -= 1;
  return alter;
}
