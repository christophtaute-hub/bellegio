import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

export type AusblickMonat = {
  /** Erster Tag des Monats (YYYY-MM-01). */
  monat: string;
  ampel: Ampel;
  /** Vorhandenes Personal in Wochenstunden. */
  istStunden: number;
  /** Benötigtes Personal in Wochenstunden (mindestens so viel wie nötig, um alle Vorgaben zu erfüllen). */
  bedarfStunden: number;
  /** Fehlende Wochenstunden Personal (0 = nichts fehlt). */
  fehlendeStunden: number;
  /** Anzahl Kinder in diesem Monat. */
  kinder: number;
  /** Kurzer Befund im Rechenweg des jeweiligen Bundeslandes (Fachbegriffe für Interessierte). */
  detail: string;
};

export type AusblickAustritt = { name: string; austritt: string; wochenstunden: number };

export type AusblickEreignis = {
  /** Erster Tag des Monats, in dem das Ereignis wirkt. */
  monat: string;
  typ: "austritt" | "kinder";
  text: string;
};

export type AusblickSatz = { ton: "ok" | "warnung" | "engpass"; text: string };

export type AusblickErgebnis = {
  modell: "bayern" | "bw" | "nrw";
  monate: AusblickMonat[];
  ersteWarnung: AusblickMonat | null;
  ersterEngpass: AusblickMonat | null;
  hoechsteLuecke: number;
  verursacher: AusblickAustritt[];
  /** Kurzer Ursachen-Satz, z.B. Austritt einer Person — null, wenn keine eindeutige Ursache erkennbar ist. */
  ursache: string | null;
  empfehlungen: string[];
  ereignisse: AusblickEreignis[];
  /** Die Aussage in einem Satz — steht ganz oben. */
  satz: AusblickSatz;
};

const zahl = (wert: number, stellen = 1) =>
  wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export function monatLang(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

function stunden(wert: number): string {
  const gerundet = Math.max(1, Math.ceil(wert));
  return `${gerundet.toLocaleString("de-DE")} ${gerundet === 1 ? "Wochenstunde" : "Wochenstunden"}`;
}

/** „fehlt“ bei genau einer Stunde, sonst „fehlen“. */
function fehlVerb(wert: number): string {
  return Math.max(1, Math.ceil(wert)) === 1 ? "fehlt" : "fehlen";
}

function bewerteMonat(m: ForecastMonth, vollzeitWochenstunden: number): AusblickMonat {
  const p = m.personal;
  const kinder = m.kpis.kinderGesamt;

  if (p.modell === "bayern") {
    const d = p.daten;
    const vollzeit = d.vollzeitWochenstunden || vollzeitWochenstunden;
    const sollGesamt = d.vzaeSoll * vollzeit;
    const luckeGesamt = Math.max(0, sollGesamt - d.istAzGesamt);
    const luckeFachkraft = Math.max(0, (d.vzaeSollFachkraft - d.istFk / (vollzeit || 1)) * vollzeit);
    const fehlend = Math.max(luckeGesamt, luckeFachkraft);
    const schluessel = d.anstellungsschluessel !== null ? `1 : ${zahl(d.anstellungsschluessel, 2)}` : "kein Personal";
    return {
      monat: m.month,
      ampel: d.ampel,
      istStunden: d.istAzGesamt,
      bedarfStunden: Math.max(sollGesamt, d.istAzGesamt + fehlend),
      fehlendeStunden: fehlend,
      kinder,
      detail: d.mindestschluesselOk
        ? d.qualifikationsschluesselOk
          ? `Anstellungsschlüssel ${schluessel} (erlaubt bis 1 : ${zahl(d.vzaeSoll > 0 ? d.gewichteteKinderzahl / d.vzaeSoll : 11, 1)})`
          : `Anstellungsschlüssel ${schluessel} erfüllt, aber die Fachkraftquote (mind. 50 %) nicht`
        : `Anstellungsschlüssel ${schluessel} liegt über dem erlaubten Höchstwert`,
    };
  }

  if (p.modell === "bw") {
    const d = p.daten;
    const ist = d.istVzaeGesamt * vollzeitWochenstunden;
    const soll = d.sollVzaeGesamt * vollzeitWochenstunden;
    return {
      monat: m.month,
      ampel: d.ampel,
      istStunden: ist,
      bedarfStunden: soll,
      fehlendeStunden: Math.max(0, soll - ist),
      kinder,
      detail: `Ist ${zahl(d.istVzaeGesamt, 2)} VZÄ, Soll ${zahl(d.sollVzaeGesamt, 2)} VZÄ (KiTaVO)`,
    };
  }

  const d = p.daten;
  const ist = d.istFk + d.istEk;
  const sollGesamt = d.sollFachkraftStundenGesamt + d.sollErgaenzungskraftStundenGesamt;
  const fehlend =
    Math.max(0, d.sollFachkraftStundenGesamt - d.istFk) + Math.max(0, d.sollErgaenzungskraftStundenGesamt - d.istEk);
  return {
    monat: m.month,
    ampel: d.ampel,
    istStunden: ist,
    bedarfStunden: Math.max(sollGesamt, ist + fehlend),
    fehlendeStunden: fehlend,
    kinder,
    detail: `Fachkraft ${zahl(d.istFk)} von ${zahl(d.sollFachkraftStundenGesamt)} Std., Ergänzungskraft ${zahl(d.istEk)} von ${zahl(d.sollErgaenzungskraftStundenGesamt)} Std. (KiBiz)`,
  };
}

function vorherigerMonat(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  const datum = new Date(Date.UTC(jahr, m - 2, 1));
  return datum.toISOString().slice(0, 10);
}

function monatVon(datum: string): string {
  return `${datum.slice(0, 7)}-01`;
}

/** Ereignisse, die den Personalbedarf verändern: Austritte von Personal und Änderungen der Kinderzahl. */
function ermittleEreignisse(monate: AusblickMonat[], austritte: AusblickAustritt[]): AusblickEreignis[] {
  const ereignisse: AusblickEreignis[] = [];
  const ersterMonat = monate[0]?.monat;
  const letzterMonat = monate[monate.length - 1]?.monat;

  for (const a of austritte) {
    // Wirksam ab dem Monat nach dem Austritt (wie die Personalplanung des Folgemonats).
    const wirksam = monatVon(new Date(Date.UTC(Number(a.austritt.slice(0, 4)), Number(a.austritt.slice(5, 7)), 1)).toISOString().slice(0, 10));
    if (!ersterMonat || wirksam < ersterMonat || wirksam > (letzterMonat as string)) continue;
    ereignisse.push({
      monat: wirksam,
      typ: "austritt",
      text: `${a.name} scheidet aus (${zahl(a.wochenstunden, 0)} Wochenstunden weniger)`,
    });
  }

  for (let i = 1; i < monate.length; i++) {
    const delta = monate[i].kinder - monate[i - 1].kinder;
    if (delta === 0) continue;
    ereignisse.push({
      monat: monate[i].monat,
      typ: "kinder",
      text: delta > 0 ? `${delta} ${delta === 1 ? "Kind" : "Kinder"} mehr` : `${-delta} ${delta === -1 ? "Kind" : "Kinder"} weniger`,
    });
  }

  return ereignisse.sort((a, b) => a.monat.localeCompare(b.monat) || a.typ.localeCompare(b.typ));
}

/** Scannt die Forecast-Monate nach dem ersten Engpass und leitet Ursachen, Ereignisse und Handlungsoptionen ab.
 * Rechnet je Bundesland im eigenen Modell (Ampeln und Sollwerte kommen aus der jeweiligen Personalplanung),
 * nur die Auswertung und die Darstellung in Wochenstunden sind gemeinsam. */
export function berechnePersonalAusblick(
  months: ForecastMonth[],
  vollzeitWochenstunden: number,
  austritte: AusblickAustritt[]
): AusblickErgebnis {
  const modell = months[0]?.personal.modell ?? "bayern";
  const monate = months.map((m) => bewerteMonat(m, vollzeitWochenstunden));
  const ersterEngpass = monate.find((m) => m.ampel === "rot") ?? null;
  const ersteWarnung = monate.find((m) => m.ampel !== "gruen") ?? null;
  const hoechsteLuecke = monate.reduce((max, m) => Math.max(max, m.fehlendeStunden), 0);

  const kritisch = ersterEngpass ?? ersteWarnung;
  const verursacher: AusblickAustritt[] = [];
  const empfehlungen: string[] = [];
  let ursache: string | null = null;

  if (kritisch) {
    const vorher = vorherigerMonat(kritisch.monat);
    verursacher.push(...austritte.filter((a) => a.austritt > vorher && a.austritt <= kritisch.monat));

    if (verursacher.length > 0) {
      const summe = verursacher.reduce((s, a) => s + a.wochenstunden, 0);
      const namen = verursacher.map((a) => a.name).join(", ");
      ursache = `${namen} ${verursacher.length === 1 ? "scheidet" : "scheiden"} aus (${zahl(summe, 0)} Wochenstunden weniger).`;
    }
    if (kritisch.fehlendeStunden > 0) {
      const luecke = stunden(kritisch.fehlendeStunden);
      empfehlungen.push(
        verursacher.length > 0
          ? `Es genügt, rund ${luecke} Personal zu ergänzen — oder die wegfallenden Stunden zu ersetzen.`
          : `Rund ${luecke} Personal ergänzen oder bestehende Stunden aufstocken.`
      );
    }

    const monatVorher = months.find((m) => m.month === vorher);
    const monatKritisch = months.find((m) => m.month === kritisch.monat);
    if (monatVorher?.personal.modell === "bayern" && monatKritisch?.personal.modell === "bayern") {
      const davor = monatVorher.personal.daten.gewichteteKinderzahl;
      const danach = monatKritisch.personal.daten.gewichteteKinderzahl;
      if (danach > davor + 0.05) {
        empfehlungen.push(
          `Die gewichtete Kinderzahl steigt von ${zahl(davor)} auf ${zahl(danach)} — Aufnahmen zeitlich strecken kann den Schlüssel entlasten.`
        );
      }
    } else if (modell === "bw") {
      empfehlungen.push("Der Bedarf hängt an Betriebsform und Öffnungszeit der Gruppen — im Szenario-Rechner lässt sich das durchspielen.");
    } else if (modell === "nrw") {
      empfehlungen.push("Der Bedarf hängt an Gruppenform und Buchungszeit — im Szenario-Rechner lässt sich das durchspielen.");
    }
  }

  return {
    modell,
    monate,
    ersteWarnung,
    ersterEngpass,
    hoechsteLuecke,
    verursacher,
    ursache,
    empfehlungen,
    ereignisse: ermittleEreignisse(monate, austritte),
    satz: formuliereSatz(monate, ersterEngpass, ersteWarnung, hoechsteLuecke),
  };
}

function formuliereSatz(
  monate: AusblickMonat[],
  ersterEngpass: AusblickMonat | null,
  ersteWarnung: AusblickMonat | null,
  hoechsteLuecke: number
): AusblickSatz {
  if (monate.length === 0) return { ton: "ok", text: "Für diese Einrichtung gibt es noch keine Daten für einen Ausblick." };

  const horizont = monate.length;
  if (ersterEngpass) {
    const sofort = ersterEngpass.monat === monate[0].monat;
    const wann = sofort ? "Schon jetzt" : `Ab ${monatLang(ersterEngpass.monat)}`;
    const fehlt = ersterEngpass.fehlendeStunden > 0 ? `${fehlVerb(ersterEngpass.fehlendeStunden)} dir rund ${stunden(ersterEngpass.fehlendeStunden)} Personal` : "reicht dein Personal nicht";
    const spaeter =
      hoechsteLuecke > ersterEngpass.fehlendeStunden * 1.25 && hoechsteLuecke - ersterEngpass.fehlendeStunden >= 1
        ? ` Später steigt die Lücke auf bis zu ${stunden(hoechsteLuecke)}.`
        : "";
    return { ton: "engpass", text: `${wann} ${fehlt}.${spaeter}` };
  }
  if (ersteWarnung) {
    const sofort = ersteWarnung.monat === monate[0].monat;
    const wann = sofort ? "Schon jetzt" : `Ab ${monatLang(ersteWarnung.monat)}`;
    const zusatz =
      ersteWarnung.fehlendeStunden > 0
        ? `Dir ${fehlVerb(ersteWarnung.fehlendeStunden)} rund ${stunden(ersteWarnung.fehlendeStunden)} Personal.`
        : "Dein Personal liegt nur noch knapp über dem Bedarf.";
    return { ton: "warnung", text: `${wann} wird es knapp: ${zusatz}` };
  }
  return { ton: "ok", text: `In den nächsten ${horizont} Monaten reicht dein Personal.` };
}
