import { berechneBelegungsVorschau, type VorschauGruppe, type VorschauKind } from "@/lib/belegung/vorschau";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { formatDate } from "@/lib/kita-datum";

/** Schwellen der Belegungs-Ampel (Entscheidung 16.10.2026): Rot = Auslastung unter 90 % jetzt oder in den nächsten
 * 3 Monaten (oder Überbelegung), Gelb = unter 95 % irgendwann in den nächsten 12 Monaten. */
export const BELEGUNG_ROT_UNTER = 0.9;
export const BELEGUNG_GELB_UNTER = 0.95;
export const BELEGUNG_ROT_MONATE = 3;
export const BELEGUNG_HORIZONT_MONATE = 12;

export type BelegungAmpel = {
  ampel: Ampel;
  /** Ein Satz, z. B. „Ab 01.02.2027 kritisch: 8 freie Plätze“. */
  satz: string;
  kinderJetzt: number;
  sollplaetze: number;
  freiJetzt: number;
  /** Erster Monat (YYYY-MM-01), der die Ampel auslöst; null bei Grün. */
  ausloeserMonat: string | null;
  freiAmAusloeser: number;
};

type Monat = { monat: string; belegt: number; geplant: number; soll: number };

function plaetze(n: number): string {
  return `${n} ${n === 1 ? "freier Platz" : "freie Plätze"}`;
}

/** Bewertet die Belegung der nächsten 12 Monate ab dem Stichtag. Geplante Nachrücker zählen mit, sobald sie eintreten.
 * Rein — nutzt die Belegungs-Vorschau (Eintritte/Austritte je Monat). */
export function berechneBelegungAmpel(gruppen: VorschauGruppe[], kinder: VorschauKind[], stichtag: string): BelegungAmpel {
  const soll = gruppen.reduce((s, g) => s + g.sollplatze, 0);
  const start = `${stichtag.slice(0, 7)}-01`;
  if (soll === 0) {
    return { ampel: "gruen", satz: "Noch keine Gruppen angelegt.", kinderJetzt: 0, sollplaetze: 0, freiJetzt: 0, ausloeserMonat: null, freiAmAusloeser: 0 };
  }
  const { zeilen } = berechneBelegungsVorschau(gruppen, kinder, start, BELEGUNG_HORIZONT_MONATE + 1);
  const monate: Monat[] = (zeilen[0]?.zellen ?? []).map((_, i) => ({
    monat: zeilen[0].zellen[i].monat,
    belegt: zeilen.reduce((s, z) => s + z.zellen[i].belegt, 0),
    geplant: zeilen.reduce((s, z) => s + z.zellen[i].nachrueckerGeplant, 0),
    soll,
  }));
  const jetzt = monate[0];
  // Geplante Nachrücker zählen mit, sobald sie eintreten; „überbelegt“ (rot) gilt nur für tatsächlich anwesende Kinder.
  const gesamt = (m: Monat) => m.belegt + m.geplant;
  const ausl = (m: Monat) => gesamt(m) / m.soll;
  const frei = (m: Monat) => m.soll - gesamt(m);
  const wann = (i: number, m: Monat) => (i === 0 ? "Jetzt" : `Ab ${formatDate(m.monat)}`);

  const basis = { kinderJetzt: gesamt(jetzt), sollplaetze: soll, freiJetzt: Math.max(0, frei(jetzt)) };

  const rotIndex = monate.findIndex((m, i) => i <= BELEGUNG_ROT_MONATE && (m.belegt > m.soll || ausl(m) < BELEGUNG_ROT_UNTER));
  if (rotIndex >= 0) {
    const m = monate[rotIndex];
    if (m.belegt > m.soll) {
      const zuviel = m.belegt - m.soll;
      return { ...basis, ampel: "rot", satz: `${wann(rotIndex, m)} überbelegt: ${zuviel} ${zuviel === 1 ? "Kind" : "Kinder"} mehr als Plätze.`, ausloeserMonat: m.monat, freiAmAusloeser: 0 };
    }
    const prozent = Math.round(ausl(m) * 100);
    return {
      ...basis,
      ampel: "rot",
      satz: rotIndex === 0 ? `Jetzt kritisch: ${plaetze(frei(m))} (${prozent} % belegt).` : `${wann(rotIndex, m)} kritisch: ${plaetze(frei(m))}.`,
      ausloeserMonat: m.monat,
      freiAmAusloeser: frei(m),
    };
  }
  const gelbIndex = monate.findIndex((m) => ausl(m) < BELEGUNG_GELB_UNTER || gesamt(m) > m.soll);
  if (gelbIndex >= 0) {
    const m = monate[gelbIndex];
    if (gesamt(m) > m.soll) {
      const mehr = gesamt(m) - m.soll;
      return { ...basis, ampel: "gelb", satz: `${wann(gelbIndex, m)} mehr Kinder eingeplant als Plätze: ${mehr}.`, ausloeserMonat: m.monat, freiAmAusloeser: 0 };
    }
    return {
      ...basis,
      ampel: "gelb",
      satz: gelbIndex === 0 ? `Nicht ganz voll: ${plaetze(frei(m))}.` : `${wann(gelbIndex, m)} werden Plätze frei: ${plaetze(frei(m))}.`,
      ausloeserMonat: m.monat,
      freiAmAusloeser: frei(m),
    };
  }
  return { ...basis, ampel: "gruen", satz: frei(jetzt) <= 0 ? "Voll belegt — nichts absehbar." : "Gut belegt — nichts absehbar.", ausloeserMonat: null, freiAmAusloeser: 0 };
}
