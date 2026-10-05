import type { AusblickErgebnis } from "@/lib/ausblick/personal-ausblick";
import type { FreiwerdenderPlatz } from "@/lib/belegung/vorschau";
import type { LangzeitHinweis } from "@/lib/team/langzeithinweise";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { ersterKritischerMonat } from "@/lib/steuerung/gruppen-status";
import type { WechselOhnePlatz, WechselVorschlag } from "@/lib/belegung/wechsel-vorschlaege";

export type HandlungsBereich = "Personal" | "Belegung" | "Daten";

/** Eine Aufgabe, die direkt zum betroffenen Datensatz führt: *was* ist los, *warum*, *wohin* klicken. */
export type Handlung = {
  id: string;
  bereich: HandlungsBereich;
  ton: "warn" | "info";
  /** Was ist das Problem — ein Satz. */
  titel: string;
  /** Warum — Ursache oder Zahlen, kurz. */
  grund: string | null;
  /** Ab wann (erster Tag des Monats oder konkretes Datum), null = jetzt/ohne Termin. */
  wann: string | null;
  /** Ziel der Aufgabe: der konkrete Datensatz (Kind, Gruppe, Person) oder die passende Liste. */
  href: string;
  /** Beschriftung des Links, z. B. „Gruppe öffnen“. */
  aktion: string;
};

export type GruppenVerlauf = {
  gruppeId: string;
  name: string;
  /** Gruppenwerte nur auswerten, wenn das Personal den Gruppen zugeordnet ist. */
  belastbar: boolean;
  modell: "bayern" | "bw" | "nrw";
  monate: { monat: string; ampel: Ampel; istStunden: number; sollStunden: number; belegt: number; sollplaetze: number }[];
};

export type HandlungsEingabe = {
  stichtag: string;
  /** Heutiges Datum — wenn der Stichtag in der Zukunft liegt, heißt „sofort“ „schon zum Stichtag“ statt „schon jetzt“. */
  heute?: string;
  ausblick: Pick<AusblickErgebnis, "satz" | "ersterEngpass" | "ersteWarnung" | "ursache" | "verursacher">;
  /** Austritts-Verursacher mit Personal-ID, falls bekannt (für den Direktlink). */
  verursacherIds: Record<string, string>;
  gruppen: GruppenVerlauf[];
  freiwerdende: FreiwerdenderPlatz[];
  kinderOhneBuchungszeit: { id: string; name: string }[];
  langzeit: (LangzeitHinweis & { artLabel: string })[];
  /** Interne Wechsel (Krippe → Kindergarten): Vorschläge und Fälle ohne absehbaren Platz. */
  wechsel?: { vorschlaege: WechselVorschlag[]; ohnePlatz: WechselOhnePlatz[] };
  /** null = kein Finanzen-Recht (dann keine Vergütungs-Aufgaben). */
  verguetungFehlt: { id: string; name: string }[] | null;
  foerderbetragFehlt: boolean | null;
};

const MAX_NAMENTLICH = 3;
const BEREICH_RANG: Record<HandlungsBereich, number> = { Personal: 0, Belegung: 1, Daten: 2 };

const zahl = (wert: number, stellen = 0) =>
  wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

function monatLang(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

function datumKurz(iso: string): string {
  const [jahr, m, t] = iso.split("-");
  return `${t}.${m}.${jahr}`;
}

const mehrzahl = (n: number, einzahl: string, plural: string) => (n === 1 ? einzahl : plural);

/** Reine Funktion: baut aus bereits berechneten Daten die Handlungsliste. Sortierung: Warnungen vor Hinweisen,
 * dann nach Termin, dann Personal vor Belegung vor Daten. Jede Aufgabe verweist auf den konkreten Datensatz. */
export function baueHandlungen(e: HandlungsEingabe): Handlung[] {
  const liste: Handlung[] = [];
  const stichtagMonat = `${e.stichtag.slice(0, 7)}-01`;
  const sofortWort = e.heute && e.stichtag > e.heute ? "Schon zum Stichtag" : "Schon jetzt";

  // 1. Personal der ganzen Einrichtung (Ausblick)
  const kritisch = e.ausblick.ersterEngpass ?? e.ausblick.ersteWarnung;
  if (kritisch) {
    const verursacherId = e.ausblick.verursacher.length === 1 ? e.verursacherIds[e.ausblick.verursacher[0].name] : undefined;
    liste.push({
      id: "personal-einrichtung",
      bereich: "Personal",
      ton: e.ausblick.ersterEngpass ? "warn" : "info",
      titel: e.ausblick.satz.text,
      grund: e.ausblick.ursache,
      wann: kritisch.monat,
      href: verursacherId ? `/team/${verursacherId}` : "/team",
      aktion: verursacherId ? "Person öffnen" : "Team öffnen",
    });
  }

  // 2. Personal und Belegung je Gruppe
  for (const g of e.gruppen) {
    if (g.belastbar) {
      const k = ersterKritischerMonat(g.monate.map((m) => ({ monat: m.monat, ampel: m.ampel })));
      if (k) {
        const monat = g.monate.find((m) => m.monat === k.monat)!;
        const fehlt = Math.max(0, monat.sollStunden - monat.istStunden);
        const sofort = k.monat <= stichtagMonat;
        liste.push({
          id: `personal-gruppe-${g.gruppeId}`,
          bereich: "Personal",
          // Bayern kennt den Schlüssel nur für die Einrichtung: ein Gruppen-Richtwert ist ein Hinweis, keine Warnung.
          ton: k.ampel === "rot" && g.modell !== "bayern" ? "warn" : "info",
          titel: `${g.name}: ${sofort ? sofortWort : `Ab ${monatLang(k.monat)}`} ${k.ampel === "rot" ? "fehlt Personal" : "wird das Personal knapp"}`,
          grund: `Ist ${zahl(monat.istStunden, 1)} von ${zahl(monat.sollStunden, 1)} Wochenstunden${fehlt > 0 ? ` — es fehlen rund ${zahl(Math.ceil(fehlt))}` : ""}`,
          wann: k.monat,
          href: `/gruppen/${g.gruppeId}`,
          aktion: "Gruppe öffnen",
        });
      }
    }
    const ueber = g.monate.find((m) => m.belegt > m.sollplaetze);
    if (ueber) {
      const sofort = ueber.monat <= stichtagMonat;
      liste.push({
        id: `ueberbelegung-${g.gruppeId}`,
        bereich: "Belegung",
        ton: "warn",
        titel: `${g.name}: ${sofort ? "überbelegt" : `ab ${monatLang(ueber.monat)} überbelegt`}`,
        grund: `${ueber.belegt} ${mehrzahl(ueber.belegt, "Kind", "Kinder")} bei ${ueber.sollplaetze} Plätzen`,
        wann: ueber.monat,
        href: `/gruppen/${g.gruppeId}`,
        aktion: "Gruppe öffnen",
      });
    }
  }

  // 3. Frei werdende Plätze ohne Nachfolger
  const offen = e.freiwerdende
    .filter((p) => p.monat >= stichtagMonat && p.bereitsEingeplant.length < p.anzahl)
    .sort((a, b) => a.monat.localeCompare(b.monat))
    .slice(0, MAX_NAMENTLICH);
  for (const p of offen) {
    const vorschlag = p.vorschlaege[0];
    const bald = p.monat <= `${nachMonaten(e.stichtag, 2)}-01`;
    liste.push({
      id: `platz-${p.gruppeId}-${p.monat}`,
      bereich: "Belegung",
      ton: bald && !vorschlag ? "warn" : "info",
      titel: `${p.gruppeName}: ${p.anzahl} ${mehrzahl(p.anzahl, "Platz wird", "Plätze werden")} frei (${monatLang(p.monat)})`,
      grund: `${namenKurz(p.abgaenge)} — ${vorschlag ? `Vorschlag: ${vorschlag.name}` : "kein Nachrücker vorgemerkt"}`,
      wann: p.monat,
      href: `/gruppen/${p.gruppeId}#nachfolge`,
      aktion: "Nachfolger zuordnen",
    });
  }

  // 3b. Interne Wechsel: Vorschläge (info) und Kinder, für die kein Kindergartenplatz absehbar ist (Warnung)
  for (const o of (e.wechsel?.ohnePlatz ?? []).slice(0, MAX_NAMENTLICH)) {
    liste.push({
      id: `wechsel-ohne-platz-${o.kindId}`,
      bereich: "Belegung",
      ton: "warn",
      titel: `${o.name}: Kein Kindergartenplatz bis zum Austritt`,
      grund: `Kann ab ${monatLang(o.fruehesterTermin)} wechseln, aber vor dem Austritt am ${datumKurz(o.austritt)} wird kein Platz frei`,
      wann: o.fruehesterTermin,
      href: `/kinder/${o.kindId}#wechsel`,
      aktion: "Kind öffnen",
    });
  }
  for (const v of (e.wechsel?.vorschlaege ?? []).slice(0, MAX_NAMENTLICH)) {
    liste.push({
      id: `wechsel-${v.kindId}`,
      bereich: "Belegung",
      ton: "info",
      titel: `${v.name}: Wechsel ${v.vonGruppeName} → ${v.nachGruppeName} ab ${monatLang(v.abDatum)} möglich`,
      grund: v.ersetztKind
        ? `Platz wird frei durch ${v.ersetztKind.name} (${datumKurz(v.ersetztKind.austritt)}); der Krippenplatz wird frei`
        : "Kindergartenplatz ist frei; der Krippenplatz wird frei",
      wann: v.abDatum,
      href: `/kinder/${v.kindId}#wechsel`,
      aktion: "Wechsel planen",
    });
  }

  // 4. Ausfälle
  for (const l of e.langzeit) {
    liste.push({
      id: `ausfall-${l.teamId}-${l.von}`,
      bereich: "Personal",
      ton: "info",
      titel: `${l.name}: ${l.artLabel}`,
      grund: `Fällt seit ${datumKurz(l.von)} aus${l.bis ? `, bis ${datumKurz(l.bis)}` : ", ohne bekanntes Ende"}`,
      wann: null,
      href: `/team/${l.teamId}`,
      aktion: "Person öffnen",
    });
  }

  // 5. Datenlücken — namentlich, höchstens drei, der Rest als eine Sammelaufgabe
  einzelnUndRest(liste, e.kinderOhneBuchungszeit, {
    idPrefix: "ohne-buchungszeit",
    titel: (k) => `${k.name}: Buchungszeit fehlt`,
    grund: "Ohne Buchungszeit fließt das Kind nicht in Förderung und Statistik ein",
    href: (k) => `/kinder/${k.id}`,
    aktion: "Kind öffnen",
    sammelTitel: (n) => `${n} weitere Kinder ohne Buchungszeit`,
    sammelHref: "/kinder",
  });
  if (e.verguetungFehlt) {
    einzelnUndRest(liste, e.verguetungFehlt, {
      idPrefix: "verguetung",
      titel: (p) => `${p.name}: Vergütung fehlt`,
      grund: "Fehlt in den Personalkosten",
      href: (p) => `/team/${p.id}`,
      aktion: "Person öffnen",
      sammelTitel: (n) => `${n} weitere Mitarbeitende ohne Vergütung`,
      sammelHref: "/team",
    });
  }
  if (e.foerderbetragFehlt) {
    liste.push({
      id: "foerderbetrag",
      bereich: "Daten",
      ton: "warn",
      titel: "Kein Förderbetrag hinterlegt",
      grund: "Die Fördererlöse bleiben 0 €",
      wann: null,
      href: "/einstellungen",
      aktion: "Einstellungen öffnen",
    });
  }

  return liste.sort(
    (a, b) =>
      (a.ton === b.ton ? 0 : a.ton === "warn" ? -1 : 1) ||
      (a.wann ?? "9999").localeCompare(b.wann ?? "9999") ||
      BEREICH_RANG[a.bereich] - BEREICH_RANG[b.bereich]
  );
}

/** Höchstens drei Namen mit Datum, der Rest als „+ n weitere“ — bei vielen Austritten (z. B. Schuleintritt) bleibt die Zeile lesbar. */
function namenKurz(abgaenge: { name: string; austritt: string }[]): string {
  const genannt = abgaenge.slice(0, 3).map((a) => `${a.name} (${datumKurz(a.austritt)})`);
  const rest = abgaenge.length - genannt.length;
  return rest > 0 ? `${genannt.join(", ")} + ${rest} weitere` : genannt.join(", ");
}

function nachMonaten(isoDatum: string, monate: number): string {
  const [jahr, m] = isoDatum.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1 + monate, 1)).toISOString().slice(0, 7);
}

function einzelnUndRest<T extends { id: string; name: string }>(
  liste: Handlung[],
  eintraege: T[],
  o: {
    idPrefix: string;
    titel: (e: T) => string;
    grund: string;
    href: (e: T) => string;
    aktion: string;
    sammelTitel: (n: number) => string;
    sammelHref: string;
  }
) {
  for (const eintrag of eintraege.slice(0, MAX_NAMENTLICH)) {
    liste.push({
      id: `${o.idPrefix}-${eintrag.id}`,
      bereich: "Daten",
      ton: "warn",
      titel: o.titel(eintrag),
      grund: o.grund,
      wann: null,
      href: o.href(eintrag),
      aktion: o.aktion,
    });
  }
  if (eintraege.length > MAX_NAMENTLICH) {
    liste.push({
      id: `${o.idPrefix}-rest`,
      bereich: "Daten",
      ton: "warn",
      titel: o.sammelTitel(eintraege.length - MAX_NAMENTLICH),
      grund: null,
      wann: null,
      href: o.sammelHref,
      aktion: "Liste öffnen",
    });
  }
}
