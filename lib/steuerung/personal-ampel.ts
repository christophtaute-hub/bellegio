import type { AusblickErgebnis } from "@/lib/ausblick/personal-ausblick";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { formatDate } from "@/lib/kita-datum";

/** Personal-Ampel (wie die Belegungs-Ampel): Rot = gesetzliche Vorgabe jetzt oder in den nächsten 3 Monaten unterschritten,
 * Gelb = knapp oder Engpass erst später im Ausblick, Grün = ausreichend. */
export const PERSONAL_ROT_MONATE = 3;

export type PersonalAmpel = {
  ampel: Ampel;
  satz: string;
  /** Warum? z. B. „Peter A. scheidet aus (30 Wochenstunden weniger).“ — null, wenn nichts auffällt. */
  ursache: string | null;
  ausloeserMonat: string | null;
};

export function berechnePersonalAmpel(ausblick: AusblickErgebnis): PersonalAmpel {
  const { monate, ersterEngpass, ersteWarnung } = ausblick;
  if (monate.length === 0) return { ampel: "gruen", satz: "Noch keine Daten für den Personal-Ausblick.", ursache: null, ausloeserMonat: null };

  // Monate Abstand zum ersten Stichtag — nicht die Position in der Liste, denn die Ampel rechnet nur mit Stützmonaten
  const index = (monat: string) => (Number(monat.slice(0, 4)) - Number(monate[0].monat.slice(0, 4))) * 12 + Number(monat.slice(5, 7)) - Number(monate[0].monat.slice(5, 7));
  const stunden = (n: number) => `${Math.max(1, Math.ceil(n)).toLocaleString("de-DE")} Wochenstunden`;

  if (ersterEngpass) {
    const i = index(ersterEngpass.monat);
    const ampel: Ampel = i <= PERSONAL_ROT_MONATE ? "rot" : "gelb";
    const wann = i === 0 ? "Jetzt" : `Ab ${formatDate(ersterEngpass.monat)}`;
    const was = ersterEngpass.fehlendeStunden > 0 ? `fehlen rund ${stunden(ersterEngpass.fehlendeStunden)} Personal` : "reicht das Personal nicht";
    return { ampel, satz: `${wann} ${was}.`, ursache: ausblick.ursache, ausloeserMonat: ersterEngpass.monat };
  }
  if (ersteWarnung) {
    const i = index(ersteWarnung.monat);
    const wann = i === 0 ? "Jetzt" : `Ab ${formatDate(ersteWarnung.monat)}`;
    return { ampel: "gelb", satz: `${wann} wird es knapp.`, ursache: ausblick.ursache, ausloeserMonat: ersteWarnung.monat };
  }
  return { ampel: "gruen", satz: "Personal reicht — nichts absehbar.", ursache: null, ausloeserMonat: null };
}
