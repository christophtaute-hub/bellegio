import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

export type RadarMonat = {
  /** Erster Tag des Monats (YYYY-MM-01). */
  monat: string;
  ampel: Ampel;
  /** Fehlende Wochenstunden Personal in diesem Monat (0 = nichts fehlt). */
  fehlendeStunden: number;
  /** Kurzer Befund im Rechenweg des jeweiligen Bundeslandes. */
  detail: string;
};

export type RadarAustritt = { name: string; austritt: string; wochenstunden: number };

export type RadarErgebnis = {
  modell: "bayern" | "bw" | "nrw";
  monate: RadarMonat[];
  ersteWarnung: RadarMonat | null;
  ersterEngpass: RadarMonat | null;
  hoechsteLuecke: number;
  verursacher: RadarAustritt[];
  /** Kurzer Ursachen-Satz, z.B. Austritt einer Person — null, wenn keine eindeutige Ursache erkennbar ist. */
  ursache: string | null;
  empfehlungen: string[];
};

const zahl = (wert: number, stellen = 1) =>
  wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

function bewerteMonat(m: ForecastMonth, vollzeitWochenstunden: number): RadarMonat {
  const p = m.personal;

  if (p.modell === "bayern") {
    const d = p.daten;
    const luckeGesamt = Math.max(0, (d.vzaeSoll - d.vzaeIst) * d.vollzeitWochenstunden);
    const luckeFachkraft = Math.max(0, (d.vzaeSollFachkraft - d.istFk / (d.vollzeitWochenstunden || 1)) * d.vollzeitWochenstunden);
    const schluessel = d.anstellungsschluessel !== null ? `1 : ${zahl(d.anstellungsschluessel, 2)}` : "kein Personal";
    return {
      monat: m.month,
      ampel: d.ampel,
      fehlendeStunden: Math.max(luckeGesamt, luckeFachkraft),
      detail: d.mindestschluesselOk
        ? d.qualifikationsschluesselOk
          ? `Anstellungsschlüssel ${schluessel} (erlaubt bis 1 : ${zahl(d.vzaeSoll > 0 ? d.gewichteteKinderzahl / d.vzaeSoll : 11, 1)})`
          : `Anstellungsschlüssel ${schluessel} erfüllt, aber die Fachkraftquote (mind. 50 %) nicht`
        : `Anstellungsschlüssel ${schluessel} liegt über dem erlaubten Höchstwert`,
    };
  }

  if (p.modell === "bw") {
    const d = p.daten;
    return {
      monat: m.month,
      ampel: d.ampel,
      fehlendeStunden: Math.max(0, (d.sollVzaeGesamt - d.istVzaeGesamt) * vollzeitWochenstunden),
      detail: `Ist ${zahl(d.istVzaeGesamt, 2)} VZÄ, Soll ${zahl(d.sollVzaeGesamt, 2)} VZÄ (KiTaVO)`,
    };
  }

  const d = p.daten;
  return {
    monat: m.month,
    ampel: d.ampel,
    fehlendeStunden:
      Math.max(0, d.sollFachkraftStundenGesamt - d.istFk) +
      Math.max(0, d.sollErgaenzungskraftStundenGesamt - d.istEk),
    detail: `Fachkraft ${zahl(d.istFk)} von ${zahl(d.sollFachkraftStundenGesamt)} Std., Ergänzungskraft ${zahl(d.istEk)} von ${zahl(d.sollErgaenzungskraftStundenGesamt)} Std. (KiBiz)`,
  };
}

function vorherigerMonat(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  const datum = new Date(Date.UTC(jahr, m - 2, 1));
  return datum.toISOString().slice(0, 10);
}

/** Scannt die Forecast-Monate nach dem ersten Engpass und leitet Ursachen und
 * Handlungsoptionen ab. Rechnet je Bundesland im eigenen Modell (die Ampeln und
 * Sollwerte kommen aus der jeweiligen Personalplanung), nur die Auswertung ist
 * gemeinsam. */
export function berechneSchluesselRadar(
  months: ForecastMonth[],
  vollzeitWochenstunden: number,
  austritte: RadarAustritt[]
): RadarErgebnis {
  const modell = months[0]?.personal.modell ?? "bayern";
  const monate = months.map((m) => bewerteMonat(m, vollzeitWochenstunden));
  const ersterEngpass = monate.find((m) => m.ampel === "rot") ?? null;
  const ersteWarnung = monate.find((m) => m.ampel !== "gruen") ?? null;
  const hoechsteLuecke = monate.reduce((max, m) => Math.max(max, m.fehlendeStunden), 0);

  const kritisch = ersterEngpass ?? ersteWarnung;
  const verursacher: RadarAustritt[] = [];
  const empfehlungen: string[] = [];
  let ursache: string | null = null;

  if (kritisch) {
    const vorher = vorherigerMonat(kritisch.monat);
    verursacher.push(
      ...austritte.filter((a) => a.austritt > vorher && a.austritt <= kritisch.monat)
    );

    if (verursacher.length > 0) {
      const summe = verursacher.reduce((s, a) => s + a.wochenstunden, 0);
      const namen = verursacher.map((a) => a.name).join(", ");
      ursache = `Austritt von ${namen} (${zahl(summe)} Wochenstunden).`;
    }
    if (kritisch.fehlendeStunden > 0) {
      const luecke = zahl(Math.ceil(kritisch.fehlendeStunden), 0);
      empfehlungen.push(
        verursacher.length > 0
          ? `Es genügt, rund ${luecke} Wochenstunden Personal zu ergänzen — oder die wegfallenden Stunden zu ersetzen.`
          : `Rund ${luecke} Wochenstunden Personal ergänzen oder bestehende Stunden aufstocken.`
      );
    }

    const monatVorher = months.find((m) => m.month === vorher);
    const monatKritisch = months.find((m) => m.month === kritisch.monat);
    if (
      monatVorher?.personal.modell === "bayern" &&
      monatKritisch?.personal.modell === "bayern"
    ) {
      const davor = monatVorher.personal.daten.gewichteteKinderzahl;
      const danach = monatKritisch.personal.daten.gewichteteKinderzahl;
      if (danach > davor + 0.05) {
        empfehlungen.push(
          `Die gewichtete Kinderzahl steigt von ${zahl(davor)} auf ${zahl(danach)} — Aufnahmen zeitlich strecken kann den Schlüssel entlasten.`
        );
      }
    } else if (modell === "bw") {
      empfehlungen.push("Der Sollwert hängt an Betriebsform und Öffnungszeit der Gruppen — im Szenario-Rechner lässt sich das durchspielen.");
    } else if (modell === "nrw") {
      empfehlungen.push("Der Sollwert hängt an Gruppenform und Buchungszeit — im Szenario-Rechner lässt sich das durchspielen.");
    }
  }

  return { modell, monate, ersteWarnung, ersterEngpass, hoechsteLuecke, verursacher, ursache, empfehlungen };
}
