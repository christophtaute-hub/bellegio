import { AMPEL_ARTEN, AMPEL_TITEL, FARBE_LABEL, ampelFarbe, istKritisch, schweregrad, type AmpelFarbe, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import { endetBald, istLaufendOderGeplant, istUeberfaellig, tageBis, type Kampagne, type KampagneStatus } from "@/lib/marketing/kampagne";

/** Fristen der automatischen Hinweise (später je Träger einstellbar). */
export type Fristen = { kampagneEndetInTagen: number; bewertungVeraltetNachTagen: number };
export const STANDARD_FRISTEN: Fristen = { kampagneEndetInTagen: 7, bewertungVeraltetNachTagen: 30 };

export type EinrichtungStamm = { id: string; name: string; kostenstelle: string | null; cluster: string | null; bundeslandCode: string; ort: string | null };

export type BewertungDaten = {
  einrichtungId: string;
  regionalleitungUserId: string | null;
  stufen: Record<MarketingAmpelArt, number | null>;
  bewertetAm: string | null;
};

export type UebersichtZeile = {
  einrichtung: EinrichtungStamm;
  regionalleitungId: string | null;
  regionalleitung: string | null;
  stufen: Record<MarketingAmpelArt, number | null>;
  /** Schlimmster Schweregrad über alle vier Ampeln (-1 = nicht bewertet). */
  schwere: number;
  bewertetAm: string | null;
  kampagnen: Kampagne[];
  aktiv: number;
  naechstesEnde: string | null;
};

export function baueZeilen(
  einrichtungen: EinrichtungStamm[],
  bewertungen: BewertungDaten[],
  kampagnen: Kampagne[],
  nutzerName: Map<string, string>
): UebersichtZeile[] {
  const bewertungJe = new Map(bewertungen.map((b) => [b.einrichtungId, b]));
  return einrichtungen
    .map((e) => {
      const b = bewertungJe.get(e.id);
      const stufen = b?.stufen ?? { personalbedarf: null, personelle_qualitaet: null, paedagogische_qualitaet: null, belegung: null };
      const eigene = kampagnen.filter((k) => k.einrichtungId === e.id);
      const aktive = eigene.filter((k) => k.status === "aktiv");
      return {
        einrichtung: e,
        regionalleitungId: b?.regionalleitungUserId ?? null,
        regionalleitung: b?.regionalleitungUserId ? (nutzerName.get(b.regionalleitungUserId) ?? "Unbekannt") : null,
        stufen,
        schwere: Math.max(...AMPEL_ARTEN.map((a) => schweregrad(a, stufen[a]))),
        bewertetAm: b?.bewertetAm ?? null,
        kampagnen: eigene,
        aktiv: aktive.length,
        naechstesEnde: aktive.map((k) => k.ende).filter((d): d is string => Boolean(d)).sort()[0] ?? null,
      };
    })
    .sort((a, b) => b.schwere - a.schwere || a.einrichtung.name.localeCompare(b.einrichtung.name, "de"));
}

export type Hinweis = {
  id: string;
  einrichtungId: string;
  einrichtungName: string;
  art: "ohne_massnahme" | "ueberfaellig" | "kritisch" | "endet_bald" | "veraltet";
  /** 3 = dringend, 2 = wichtig, 1 = beachten */
  schwere: 1 | 2 | 3;
  text: string;
};

const KAMPAGNEN_ART_ZU_AMPEL: { ampel: MarketingAmpelArt; kampagne: "personal" | "belegung"; wort: string }[] = [
  { ampel: "personalbedarf", kampagne: "personal", wort: "Personalbedarf" },
  { ampel: "belegung", kampagne: "belegung", wort: "Belegung" },
];

function tageSeit(iso: string, heute: string): number {
  return -tageBis(iso.slice(0, 10), heute);
}

/** Die automatischen Hinweise (schlimmste zuerst): kritisch ohne Maßnahme, überfällige Maßnahmen, rote/orange Ampeln, bald endende
 * Kampagnen, veraltete Bewertungen. Rein und getestet — wird beim Laden aus den gespeicherten Daten berechnet. */
export function ermittleHinweise(zeilen: UebersichtZeile[], heute: string, fristen: Fristen = STANDARD_FRISTEN): Hinweis[] {
  const hinweise: Hinweis[] = [];
  for (const z of zeilen) {
    const e = z.einrichtung;
    const neu = (art: Hinweis["art"], schwere: Hinweis["schwere"], text: string, schluessel: string) =>
      hinweise.push({ id: `${e.id}-${art}-${schluessel}`, einrichtungId: e.id, einrichtungName: e.name, art, schwere, text });

    // 1) kritisch ohne passende Maßnahme
    for (const m of KAMPAGNEN_ART_ZU_AMPEL) {
      if (!istKritisch(m.ampel, z.stufen[m.ampel])) continue;
      const farbe = FARBE_LABEL[ampelFarbe(m.ampel, z.stufen[m.ampel]) as AmpelFarbe];
      const hatMassnahme = z.kampagnen.some((k) => k.art === m.kampagne && istLaufendOderGeplant(k));
      if (!hatMassnahme) neu("ohne_massnahme", 3, `${m.wort} ${farbe} — keine Kampagne hinterlegt`, m.ampel);
    }
    // 2) rote/orange Ampeln (auch mit Maßnahme sichtbar, aber weniger dringend)
    for (const a of AMPEL_ARTEN) {
      if (!istKritisch(a, z.stufen[a])) continue;
      const m = KAMPAGNEN_ART_ZU_AMPEL.find((x) => x.ampel === a);
      const hatMassnahme = m ? z.kampagnen.some((k) => k.art === m.kampagne && istLaufendOderGeplant(k)) : false;
      if (m && !hatMassnahme) continue; // schon als „ohne Maßnahme“ gemeldet
      neu("kritisch", 2, `${AMPEL_TITEL[a]} ${FARBE_LABEL[ampelFarbe(a, z.stufen[a]) as AmpelFarbe]}${m ? " — Kampagne läuft bzw. ist geplant" : ""}`, a);
    }
    // 3) Kampagnen: bald endend, überfällig
    for (const k of z.kampagnen) {
      if (endetBald(k, heute, fristen.kampagneEndetInTagen) && k.ende) {
        const rest = tageBis(k.ende, heute);
        neu("endet_bald", 2, `Kampagne „${k.beworbenes}“ endet ${rest === 0 ? "heute" : `in ${rest} ${rest === 1 ? "Tag" : "Tagen"}`}`, k.id);
      }
      if (istUeberfaellig(k, heute)) neu("ueberfaellig", 3, `Kampagne „${k.beworbenes}“ ist überfällig (Status, Zeitraum oder nächster Schritt prüfen)`, k.id);
    }
    // 4) Bewertung veraltet
    if (!z.bewertetAm) neu("veraltet", 1, "Noch nie bewertet", "nie");
    else {
      const alter = tageSeit(z.bewertetAm, heute);
      if (alter > fristen.bewertungVeraltetNachTagen) neu("veraltet", 1, `Bewertung seit ${alter} Tagen nicht aktualisiert`, "alt");
    }
  }
  return hinweise.sort((a, b) => b.schwere - a.schwere || a.einrichtungName.localeCompare(b.einrichtungName, "de"));
}

export type Filter = {
  bundesland?: string;
  cluster?: string;
  regionalleitung?: string;
  q?: string;
  farbe?: AmpelFarbe;
  kampagne?: KampagneStatus;
  /** Kennzahl-Kacheln: kritisch, ohne_massnahme, veraltet, laufend */
  fokus?: "kritisch" | "ohne_massnahme" | "veraltet" | "laufend";
};

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filtereZeilen(zeilen: UebersichtZeile[], f: Filter, hinweise: Hinweis[]): UebersichtZeile[] {
  const mitHinweis = (art: Hinweis["art"]) => new Set(hinweise.filter((h) => h.art === art).map((h) => h.einrichtungId));
  const ohneMassnahme = mitHinweis("ohne_massnahme");
  const veraltet = mitHinweis("veraltet");
  const q = f.q ? norm(f.q.trim()) : "";
  return zeilen.filter((z) => {
    const e = z.einrichtung;
    if (f.bundesland && e.bundeslandCode !== f.bundesland) return false;
    if (f.cluster && (e.cluster ?? "") !== f.cluster) return false;
    if (f.regionalleitung && z.regionalleitungId !== f.regionalleitung) return false;
    if (q && !norm(`${e.name} ${e.kostenstelle ?? ""} ${e.ort ?? ""}`).includes(q)) return false;
    if (f.farbe && !AMPEL_ARTEN.some((a) => ampelFarbe(a, z.stufen[a]) === f.farbe)) return false;
    if (f.kampagne && !z.kampagnen.some((k) => k.status === f.kampagne)) return false;
    if (f.fokus === "kritisch" && !AMPEL_ARTEN.some((a) => istKritisch(a, z.stufen[a]))) return false;
    if (f.fokus === "ohne_massnahme" && !ohneMassnahme.has(e.id)) return false;
    if (f.fokus === "veraltet" && !veraltet.has(e.id)) return false;
    if (f.fokus === "laufend" && z.aktiv === 0) return false;
    return true;
  });
}

export function kennzahlen(zeilen: UebersichtZeile[], hinweise: Hinweis[]) {
  return {
    kritisch: zeilen.filter((z) => AMPEL_ARTEN.some((a) => istKritisch(a, z.stufen[a]))).length,
    laufendeKampagnen: zeilen.reduce((s, z) => s + z.aktiv, 0),
    ohneMassnahme: new Set(hinweise.filter((h) => h.art === "ohne_massnahme").map((h) => h.einrichtungId)).size,
    veraltet: new Set(hinweise.filter((h) => h.art === "veraltet").map((h) => h.einrichtungId)).size,
  };
}
