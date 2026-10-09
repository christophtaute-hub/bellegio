import { abgleichen, nichtMehrInDatei, type BestandsZeile, type FeldBeschreibung, type ImportQuelle } from "@/lib/import/abgleich";
import { normalisiere } from "@/lib/import/hilfen";
import type { KindFeld, KindImportDaten, KindImportErgebnis } from "@/lib/import/kinder";

/** Ein Kind im Bestand, so wie es der Abgleich braucht. */
export type KindBestand = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  externe_id: string | null;
  datenquelle: string | null;
  gruppe_id: string | null;
  status: string;
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  buchungszeit_band_id: string | null;
  wohnort: string | null;
  hat_behinderung: boolean;
};

export const KIND_ABGLEICH_FELDER: (FeldBeschreibung & { spalte: KindFeld | null })[] = [
  { feld: "vorname", label: "Vorname", spalte: null },
  { feld: "nachname", label: "Nachname", spalte: null },
  { feld: "geburtsdatum", label: "Geburtsdatum", spalte: null },
  { feld: "gruppe", label: "Gruppe", spalte: "gruppe" },
  { feld: "status", label: "Status", spalte: "status" },
  { feld: "eintritt", label: "Eintritt", spalte: "eintritt" },
  { feld: "austritt", label: "Austritt", spalte: "austritt" },
  { feld: "vertrag_bis", label: "Vertrag gültig bis", spalte: "vertrag_bis" },
  { feld: "buchungszeit", label: "Buchungszeit", spalte: "buchungszeit" },
  { feld: "wohnort", label: "Wohnort", spalte: "wohnort" },
  { feld: "istatus", label: "I-Status", spalte: "istatus" },
];

const STATUS_TEXT: Record<string, string> = { aktiv: "Aktiv", nachruecker: "Nachrücker", geplant: "Geplant" };
export const kindSchluessel = (v: string, n: string, g: string) => `${normalisiere(v)}|${normalisiere(n)}|${g}`;

type Namen = { gruppen: { id: string; name: string }[]; baender: { id: string; label: string }[] };

function bestandWerte(k: KindBestand, namen: Namen): Record<string, string | null> {
  return {
    vorname: k.vorname,
    nachname: k.nachname,
    geburtsdatum: k.geburtsdatum,
    gruppe: namen.gruppen.find((g) => g.id === k.gruppe_id)?.name ?? null,
    status: STATUS_TEXT[k.status] ?? k.status,
    eintritt: k.eintritt,
    austritt: k.austritt,
    vertrag_bis: k.vertrag_gueltig_bis,
    buchungszeit: namen.baender.find((b) => b.id === k.buchungszeit_band_id)?.label ?? null,
    wohnort: k.wohnort,
    istatus: k.hat_behinderung ? "Ja" : "Nein",
  };
}

/** Werte aus der Datei. Leere Zellen und fehlende Spalten ändern nichts — eine leere Zelle löscht keinen bestehenden Wert. */
function dateiWerte(d: KindImportDaten, erkannt: Set<KindFeld>, namen: Namen): Record<string, string | null> {
  const werte: Record<string, string | null> = { vorname: d.vorname, nachname: d.nachname, geburtsdatum: d.geburtsdatum };
  const setze = (feld: string, spalte: KindFeld, wert: string | null) => {
    if (erkannt.has(spalte) && wert !== null && wert !== "") werte[feld] = wert;
  };
  setze("gruppe", "gruppe", namen.gruppen.find((g) => g.id === d.gruppe_id)?.name ?? null);
  setze("status", "status", STATUS_TEXT[d.status] ?? d.status);
  setze("eintritt", "eintritt", d.eintritt);
  if (!d.austritt_vorgeschlagen) setze("austritt", "austritt", d.austritt);
  setze("vertrag_bis", "vertrag_bis", d.vertrag_gueltig_bis);
  setze("buchungszeit", "buchungszeit", namen.baender.find((b) => b.id === d.buchungszeit_band_id)?.label ?? null);
  setze("wohnort", "wohnort", d.wohnort);
  setze("istatus", "istatus", erkannt.has("istatus") ? (d.hat_behinderung ? "Ja" : "Nein") : null);
  return werte;
}

/** Ergänzt das Prüfergebnis um den Abgleich mit dem Bestand: je Zeile neu / aktualisieren / unverändert, dazu Kinder dieser Quelle,
 * die in der Datei nicht mehr vorkommen. Schreibt nichts. */
export function ergaenzeKinderAbgleich(
  ergebnis: KindImportErgebnis,
  bestand: KindBestand[],
  quelle: ImportQuelle,
  namen: Namen
): KindImportErgebnis {
  const erkannt = new Set(ergebnis.erkannteSpalten.map((s) => s.feld));
  const vergleich: BestandsZeile[] = bestand.map((k) => ({
    id: k.id,
    externeId: k.externe_id,
    quelle: k.datenquelle,
    schluessel: kindSchluessel(k.vorname, k.nachname, k.geburtsdatum),
    werte: bestandWerte(k, namen),
  }));
  const getroffen = new Set<string>();
  const zeilen = ergebnis.zeilen.map((z) => {
    if (!z.kind) return z;
    const a = abgleichen(
      { externeId: z.kind.externe_id, schluessel: kindSchluessel(z.kind.vorname, z.kind.nachname, z.kind.geburtsdatum), werte: dateiWerte(z.kind, erkannt, namen) },
      vergleich,
      quelle,
      KIND_ABGLEICH_FELDER
    );
    if (a.id) getroffen.add(a.id);
    return { ...z, abgleich: a };
  });
  const mitAbgleich = zeilen.filter((z) => z.abgleich);
  return {
    ...ergebnis,
    zeilen,
    abgleich: {
      neu: mitAbgleich.filter((z) => z.abgleich!.aktion === "neu").length,
      aktualisieren: mitAbgleich.filter((z) => z.abgleich!.aktion === "aktualisieren").length,
      unveraendert: mitAbgleich.filter((z) => z.abgleich!.aktion === "unveraendert").length,
      nichtMehrInDatei: nichtMehrInDatei(vergleich, getroffen, quelle).map((b) => `${b.werte.vorname} ${b.werte.nachname}`),
    },
  };
}
