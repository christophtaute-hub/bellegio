/** Abgleich einer Importdatei mit dem Bestand (z. B. Kinder aus KigaRoo, Personal aus rexx): neu / aktualisieren / unverändert.
 * Rein und ohne Datenbank — die Übernahme geschieht in lib/actions/import.ts. */

export type ImportQuelle = "kigaroo" | "rexx" | "excel";

export const QUELLEN_LABEL: Record<ImportQuelle, string> = {
  kigaroo: "KigaRoo",
  rexx: "rexx",
  excel: "Excel / andere Liste",
};

export type FeldAenderung = { feld: string; label: string; alt: string | null; neu: string | null };
export type Abgleich = {
  aktion: "neu" | "aktualisieren" | "unveraendert";
  /** Id des gefundenen Datensatzes (bei „aktualisieren“ und „unverändert“). */
  id?: string;
  aenderungen: FeldAenderung[];
};

/** Ein Bestandsdatensatz in Vergleichsform: Werte sind Anzeigetexte (Gruppe als Name, Datum als ISO). */
export type BestandsZeile = {
  id: string;
  externeId: string | null;
  quelle: string | null;
  /** Name (und Geburtsdatum) — zum Wiedererkennen, wenn keine Nummer vorliegt. */
  schluessel: string;
  werte: Record<string, string | null>;
};

export type DateiZeile = {
  externeId: string | null;
  schluessel: string;
  /** Nur Felder, deren Spalte in der Datei vorhanden ist — fehlende Spalten verändern nichts. */
  werte: Record<string, string | null>;
};

export type FeldBeschreibung = { feld: string; label: string };

const gleich = (a: string | null | undefined, b: string | null | undefined) => (a ?? "") === (b ?? "");

/** Findet zur Dateizeile den Bestandsdatensatz: erst über die Nummer der Quelle, dann (um einen bisher ohne Nummer angelegten Eintrag
 * zu übernehmen) über Name/Geburtsdatum. Ein Eintrag, der schon eine Nummer dieser Quelle hat, wird nie über den Namen „gestohlen“. */
export function findeBestand(zeile: DateiZeile, bestand: BestandsZeile[], quelle: ImportQuelle): { treffer: BestandsZeile | null; uebernahmeNummer: boolean } {
  if (zeile.externeId) {
    const perNummer = bestand.find((b) => b.quelle === quelle && b.externeId === zeile.externeId);
    if (perNummer) return { treffer: perNummer, uebernahmeNummer: false };
    const perName = bestand.find((b) => b.schluessel === zeile.schluessel && !b.externeId);
    return { treffer: perName ?? null, uebernahmeNummer: perName !== undefined };
  }
  const perName = bestand.find((b) => b.schluessel === zeile.schluessel);
  return { treffer: perName ?? null, uebernahmeNummer: false };
}

export function abgleichen(zeile: DateiZeile, bestand: BestandsZeile[], quelle: ImportQuelle, felder: FeldBeschreibung[]): Abgleich {
  const { treffer, uebernahmeNummer } = findeBestand(zeile, bestand, quelle);
  if (!treffer) return { aktion: "neu", aenderungen: [] };
  const aenderungen: FeldAenderung[] = [];
  for (const f of felder) {
    if (!(f.feld in zeile.werte)) continue;
    const neu = zeile.werte[f.feld];
    const alt = treffer.werte[f.feld] ?? null;
    if (!gleich(alt, neu)) aenderungen.push({ feld: f.feld, label: f.label, alt, neu });
  }
  if (uebernahmeNummer) aenderungen.push({ feld: "externe_id", label: `${QUELLEN_LABEL[quelle]}-Nummer`, alt: null, neu: zeile.externeId });
  return { aktion: aenderungen.length > 0 ? "aktualisieren" : "unveraendert", id: treffer.id, aenderungen };
}

/** Datensätze, die aus dieser Quelle stammen, in der Datei aber nicht mehr vorkommen — nur als Hinweis, nie automatisch geändert. */
export function nichtMehrInDatei(bestand: BestandsZeile[], getroffeneIds: Set<string>, quelle: ImportQuelle): BestandsZeile[] {
  return bestand.filter((b) => b.quelle === quelle && !getroffeneIds.has(b.id));
}
