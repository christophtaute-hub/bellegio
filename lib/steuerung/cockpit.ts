import { monatLang, type AusblickMonat } from "@/lib/ausblick/personal-ausblick";
import { belegungStatus, PERSONAL_STATUS, stellenText, UEBERHANG_STATUS } from "@/lib/ui/status";
import type { SteuerungsDaten } from "@/lib/steuerung/lade-steuerung";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

export type MonatsStatus = "ok" | "knapp" | "fehlt" | "ueberhang";

export type CockpitMonat = {
  monat: string;
  /** „Okt. 26“ */
  label: string;
  kinder: number;
  plaetze: number;
  belegungProzent: number;
  personalProzent: number;
  /** Personal in Wochenstunden: vorhanden (Ist) und nötig (Soll). */
  personalIst: number;
  personalSoll: number;
  status: MonatsStatus;
  /** Ein Satz in Alltagssprache. */
  text: string;
  /** Der Rechenweg des Bundeslands in Fachbegriffen (für Interessierte). */
  fachlich: string;
  ereignisse: string[];
};

export type CockpitDaten = {
  jetzt: {
    kinder: number;
    plaetze: number;
    belegungWort: string;
    belegungTon: "ok" | "voll" | "frei" | "zuviel";
    personalProzent: number;
    /** Wochenstunden Personal: vorhanden (Ist) und nötig (Soll). */
    personalIst: number;
    personalSoll: number;
    personalAmpel: Ampel;
    personalWort: string;
    /** „172 von 192 nötigen Wochenstunden“ */
    personalKlartext: string;
    fachKennzahl: { label: string; value: string };
  };
  satz: { ton: "ok" | "warnung" | "engpass" | "info"; text: string };
  monate: CockpitMonat[];
  /** Was hilft? (nur bei Engpass) */
  empfehlungen: string[];
  ergebnis: number | null;
};

const stunden = (wert: number) => `${Math.max(1, Math.round(wert)).toLocaleString("de-DE")} Wochenstunden`;
const prozent = (ist: number, soll: number) => (soll > 0 ? Math.round((ist / soll) * 100) : 100);

function monatKurz(iso: string): string {
  return new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, 1)).toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function statusVon(m: AusblickMonat): MonatsStatus {
  if (m.ampel === "rot") return "fehlt";
  if (m.ampel === "gelb") return "knapp";
  return m.ueberhangStunden > 0 ? "ueberhang" : "ok";
}

function textFuer(m: AusblickMonat, status: MonatsStatus, vollzeit: number): string {
  if (status === "fehlt") {
    return m.fehlendeStunden > 0
      ? `Es fehlen rund ${stunden(m.fehlendeStunden)} Personal (${stellenText(m.fehlendeStunden, vollzeit)}).`
      : "Das Personal reicht nicht aus.";
  }
  if (status === "knapp") return "Das Personal reicht gerade so.";
  if (status === "ueberhang") return `Rund ${stunden(m.ueberhangStunden)} mehr Personal als nötig (${stellenText(m.ueberhangStunden, vollzeit)}).`;
  return "Alles in Ordnung.";
}

/** Bereitet die Dashboard-Daten für das Cockpit auf: alles in Prozent, Wörtern und einem Satz je Monat. Rein und testbar. */
export function baueCockpit(daten: SteuerungsDaten): CockpitDaten {
  const vollzeitWochenstunden = daten.vollzeitWochenstunden;
  const plaetze = daten.belegung.sollplaetze;
  const erster = daten.ausblick.monate[0];
  const ereignisseJeMonat = new Map<string, string[]>();
  for (const e of daten.ausblick.ereignisse) {
    ereignisseJeMonat.set(e.monat, [...(ereignisseJeMonat.get(e.monat) ?? []), e.text]);
  }

  const monate: CockpitMonat[] = daten.ausblick.monate.map((m) => {
    const status = statusVon(m);
    return {
      monat: m.monat,
      label: monatKurz(m.monat),
      kinder: m.kinder,
      plaetze,
      belegungProzent: plaetze > 0 ? Math.round((m.kinder / plaetze) * 100) : 0,
      personalProzent: prozent(m.istStunden, m.sollStunden),
      personalIst: Math.round(m.istStunden),
      personalSoll: Math.round(m.sollStunden),
      status,
      text: textFuer(m, status, vollzeitWochenstunden),
      fachlich: m.detail,
      ereignisse: ereignisseJeMonat.get(m.monat) ?? [],
    };
  });

  const belegung = belegungStatus(daten.belegung.belegt, plaetze);
  const ampel = daten.personal.ampel;
  const ueberhangJetzt = erster ? statusVon(erster) === "ueberhang" : false;

  let satz: CockpitDaten["satz"] = daten.ausblick.satz;
  const ueberhang = daten.ausblick.ersterUeberhang;
  if (satz.ton === "ok" && ueberhang) {
    satz = {
      ton: "info",
      text: `Ab ${monatLang(ueberhang.monat)} hast du rund ${stunden(ueberhang.ueberhangStunden)} mehr Personal als nötig (${stellenText(ueberhang.ueberhangStunden, vollzeitWochenstunden)}).`,
    };
  } else if (satz.ton === "engpass" && daten.ausblick.ersterEngpass && daten.ausblick.ersterEngpass.fehlendeStunden > 0) {
    satz = { ...satz, text: `${satz.text} Das ist ${stellenText(daten.ausblick.ersterEngpass.fehlendeStunden, vollzeitWochenstunden)}.` };
  }

  return {
    jetzt: {
      kinder: daten.belegung.belegt,
      plaetze,
      belegungWort: belegung.wort,
      belegungTon: belegung.ton,
      personalProzent: erster ? prozent(erster.istStunden, erster.sollStunden) : 100,
      personalIst: erster ? Math.round(erster.istStunden) : 0,
      personalSoll: erster ? Math.round(erster.sollStunden) : 0,
      personalAmpel: ampel,
      personalWort: ampel === "gruen" && ueberhangJetzt ? UEBERHANG_STATUS : PERSONAL_STATUS[ampel],
      personalKlartext: erster
        ? `${Math.round(erster.istStunden).toLocaleString("de-DE")} von ${Math.round(erster.sollStunden).toLocaleString("de-DE")} nötigen Wochenstunden`
        : "",
      fachKennzahl: { label: daten.personal.kennzahl.label, value: daten.personal.kennzahl.value },
    },
    satz,
    monate,
    empfehlungen: satz.ton === "engpass" || satz.ton === "warnung" ? daten.ausblick.empfehlungen.slice(0, 2) : [],
    ergebnis: daten.finanzen ? daten.finanzen.ergebnisMonat : null,
  };
}

