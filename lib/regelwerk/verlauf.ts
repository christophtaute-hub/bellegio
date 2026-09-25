/**
 * Auflösung "welche Fassung einer Gesetzeskonstante galt am Stichtag X" — generalisierte Version von
 * resolveBandAmStichtag (lib/kinder/buchungszeit-historie.ts) für die 6 Bundesland-Regelwerk-
 * Tabellen aus Milestone 29b. Anders als bei kind_buchungszeit_historie (nur gueltig_ab, "gültig bis"
 * ergibt sich aus dem nächsten Eintrag) haben Regelwerk-Versionen ein explizites gueltig_bis: die
 * Live-Zeile bleibt über eine stabile id von anderen Tabellen referenziert (kinder.buchungszeit_band_id
 * u.a.), ihre Werte werden bei einer Gesetzesänderung in-place überschrieben statt eine neue Zeile
 * anzuhängen — die Historie-Zeile bekommt darum ein explizites Enddatum statt implizit "bis zur
 * nächsten Zeile".
 */
export type Versioniert = { gueltigAb: string; gueltigBis: string | null };

/** Stichtag-Auflösung: gueltigAb <= stichtag < gueltigBis (bzw. gueltigBis === null für die aktuell
 * gültige Fassung). Liefert null, wenn keine Version zum Stichtag existiert (Stichtag vor der
 * ersten bekannten Fassung, oder eine Lücke in der Historie — siehe versionAmStichtagMitFallback für
 * Aufrufer, denen eine Lücke gefährlicher ist als eine mutmaßlich zu alte Fassung). */
export function versionAmStichtag<T extends Versioniert>(versionen: T[], stichtag: string): T | null {
  let treffer: T | null = null;
  for (const v of versionen) {
    if (v.gueltigAb > stichtag) continue;
    if (v.gueltigBis !== null && v.gueltigBis <= stichtag) continue;
    if (!treffer || v.gueltigAb > treffer.gueltigAb) treffer = v;
  }
  return treffer;
}

/** Wie versionAmStichtag, fällt bei einer Lücke (Stichtag vor der ersten bekannten Fassung einer
 * Regel) aber auf die älteste bekannte Fassung zurück, statt null zu liefern — für Aufrufer, bei
 * denen "keine Regel gefunden" praktisch nie richtig sein kann (z.B. ein gesetzlicher
 * Mindestpersonalschlüssel gilt faktisch immer, auch vor der ersten in dieser App erfassten
 * Fassung). Gleiche Philosophie wie der kind_buchungszeit_historie-Backfill-Kommentar: "Stichtage
 * davor zeigen weiterhin den [ältesten bekannten] Wert". */
export function versionAmStichtagMitFallback<T extends Versioniert>(versionen: T[], stichtag: string): T | null {
  return versionAmStichtag(versionen, stichtag) ?? aeltesteVersion(versionen);
}

function aeltesteVersion<T extends Versioniert>(versionen: T[]): T | null {
  return versionen.reduce<T | null>((aelteste, v) => (!aelteste || v.gueltigAb < aelteste.gueltigAb ? v : aelteste), null);
}
