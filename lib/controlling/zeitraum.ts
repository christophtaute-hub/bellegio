import { addMonthsUtc, kitajahrBeginnIso, kitajahrLabel, kitajahrStartJahr, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";

/** Höchstzahl Monate, die Controlling und Prüfungsmappe auf einmal berechnen (drei Jahre). */
export const MAX_MONATE = 36;
const FRUEHESTES_JAHR = 2020;

export type ZeitraumArt = "kitajahr" | "kalenderjahr" | "mehrjahre" | "frei";

export type Zeitraum = {
  art: ZeitraumArt;
  /** Erster Monat des Zeitraums (YYYY-MM-01). */
  von: string;
  monate: number;
  /** Kurzbeschreibung für Überschriften, z. B. „Kitajahr 2026/27“. */
  label: string;
  /** Bei „kitajahr“ und „kalenderjahr“ das gewählte Jahr, bei „mehrjahre“ das erste Jahr. */
  jahr: number;
  /** Bei „mehrjahre“ das letzte Jahr, sonst gleich `jahr`. */
  bisJahr: number;
};

export type ZeitraumParameter = { art?: string; jahr?: string; bis?: string; von?: string; monate?: string };

function begrenze(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

function jahrOder(wert: string | undefined, standard: number, max: number): number {
  const n = Number(wert);
  return Number.isInteger(n) && n > 0 ? begrenze(n, FRUEHESTES_JAHR, max) : standard;
}

/** Übersetzt die URL-Parameter in einen Zeitraum. Ohne Angabe gilt das laufende Kitajahr der Einrichtung. `von`/`monate`
 * (alte Links) bleiben als „frei“ erhalten. */
export function loeseZeitraumAuf(params: ZeitraumParameter, kitajahrBeginnMonat: number, heute: Date): Zeitraum {
  const aktuellesJahr = heute.getUTCFullYear();
  const maxJahr = aktuellesJahr + 3;

  if (params.von && /^\d{4}-\d{2}(-\d{2})?$/.test(params.von) && !params.art) {
    const von = `${params.von.slice(0, 7)}-01`;
    const monate = begrenze(Number(params.monate) || 12, 1, MAX_MONATE);
    return { art: "frei", von, monate, label: `ab ${von.slice(5, 7)}/${von.slice(0, 4)}`, jahr: Number(von.slice(0, 4)), bisJahr: Number(von.slice(0, 4)) };
  }

  if (params.art === "kalenderjahr") {
    const jahr = jahrOder(params.jahr, aktuellesJahr, maxJahr);
    return { art: "kalenderjahr", von: `${jahr}-01-01`, monate: 12, label: `Kalenderjahr ${jahr}`, jahr, bisJahr: jahr };
  }

  if (params.art === "mehrjahre") {
    const jahr = jahrOder(params.jahr, aktuellesJahr - 1, maxJahr);
    const bis = begrenze(jahrOder(params.bis, jahr + 1, maxJahr), jahr, jahr + MAX_MONATE / 12 - 1);
    return { art: "mehrjahre", von: `${jahr}-01-01`, monate: (bis - jahr + 1) * 12, label: bis === jahr ? `${jahr}` : `${jahr}–${bis}`, jahr, bisJahr: bis };
  }

  const jahr = jahrOder(params.jahr, kitajahrStartJahr(heute, kitajahrBeginnMonat), maxJahr);
  return {
    art: "kitajahr",
    von: kitajahrBeginnIso(jahr, kitajahrBeginnMonat),
    monate: 12,
    label: `Kitajahr ${kitajahrLabel(jahr, kitajahrBeginnMonat)}`,
    jahr,
    bisJahr: jahr,
  };
}

/** Alle Monate des Zeitraums als ISO-Daten (jeweils der Erste). */
export function zeitraumMonate(zeitraum: Pick<Zeitraum, "von" | "monate">): string[] {
  const start = parseIsoDate(zeitraum.von);
  return Array.from({ length: zeitraum.monate }, (_, i) => toIsoDateString(addMonthsUtc(start, i)));
}

/** Letzter Tag des Zeitraums (ISO). */
export function zeitraumEnde(zeitraum: Pick<Zeitraum, "von" | "monate">): string {
  const letzterMonat = parseIsoDate(zeitraumMonate(zeitraum).at(-1) as string);
  return toIsoDateString(new Date(Date.UTC(letzterMonat.getUTCFullYear(), letzterMonat.getUTCMonth() + 1, 0)));
}

/** URL-Parameter für einen Zeitraum, z. B. „art=kitajahr&jahr=2026“. */
export function zeitraumQuery(art: ZeitraumArt, jahr: number, bisJahr?: number): string {
  const teile = [`art=${art}`, `jahr=${jahr}`];
  if (art === "mehrjahre") teile.push(`bis=${bisJahr ?? jahr + 1}`);
  return teile.join("&");
}
