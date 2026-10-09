import { abgleichen, nichtMehrInDatei, type BestandsZeile, type FeldBeschreibung, type ImportQuelle } from "@/lib/import/abgleich";
import { normalisiere } from "@/lib/import/hilfen";
import type { TeamFeld, TeamImportDaten, TeamImportErgebnis } from "@/lib/import/team";

export type TeamBestand = {
  id: string;
  vorname: string | null;
  nachname: string | null;
  externe_id: string | null;
  datenquelle: string | null;
  rolle: string | null;
  role_category: string | null;
  wochenstunden: number | null;
  gruppe_id: string | null;
  status: string | null;
  eintritt: string | null;
  austritt: string | null;
};

export const TEAM_ABGLEICH_FELDER: FeldBeschreibung[] = [
  { feld: "vorname", label: "Vorname" },
  { feld: "nachname", label: "Nachname" },
  { feld: "rolle", label: "Rolle" },
  { feld: "wochenstunden", label: "Wochenstunden" },
  { feld: "gruppe", label: "Gruppe" },
  { feld: "status", label: "Status" },
  { feld: "eintritt", label: "Eintritt" },
  { feld: "austritt", label: "Austritt" },
];

const STATUS_TEXT: Record<string, string> = { aktiv: "Aktiv", inaktiv: "Inaktiv", geplant: "Geplant" };
export const teamSchluessel = (v: string | null, n: string | null) => `${normalisiere(v ?? "")}|${normalisiere(n ?? "")}`;
const stunden = (n: number | null) => (n === null ? null : String(Number(n)));

type Namen = { gruppen: { id: string; name: string }[] };

function bestandWerte(m: TeamBestand, namen: Namen): Record<string, string | null> {
  return {
    vorname: m.vorname,
    nachname: m.nachname,
    rolle: m.rolle,
    wochenstunden: stunden(m.wochenstunden),
    gruppe: namen.gruppen.find((g) => g.id === m.gruppe_id)?.name ?? null,
    status: m.status ? (STATUS_TEXT[m.status] ?? m.status) : null,
    eintritt: m.eintritt,
    austritt: m.austritt,
  };
}

/** Leere Zellen und fehlende Spalten ändern nichts. */
function dateiWerte(d: TeamImportDaten, erkannt: Set<TeamFeld>, namen: Namen): Record<string, string | null> {
  const werte: Record<string, string | null> = { vorname: d.vorname, nachname: d.nachname, wochenstunden: stunden(d.wochenstunden) };
  const setze = (feld: string, spalte: TeamFeld | TeamFeld[], wert: string | null) => {
    const da = Array.isArray(spalte) ? spalte.some((s) => erkannt.has(s)) : erkannt.has(spalte);
    if (da && wert) werte[feld] = wert;
  };
  setze("rolle", ["rolle", "kategorie"], d.rolle);
  setze("gruppe", "gruppe", namen.gruppen.find((g) => g.id === d.gruppe_id)?.name ?? null);
  setze("status", "status", STATUS_TEXT[d.status] ?? d.status);
  setze("eintritt", "eintritt", d.eintritt);
  setze("austritt", "austritt", d.austritt);
  return werte;
}

export function ergaenzeTeamAbgleich(ergebnis: TeamImportErgebnis, bestand: TeamBestand[], quelle: ImportQuelle, namen: Namen): TeamImportErgebnis {
  const erkannt = new Set(ergebnis.erkannteSpalten.map((s) => s.feld));
  const vergleich: BestandsZeile[] = bestand.map((m) => ({
    id: m.id,
    externeId: m.externe_id,
    quelle: m.datenquelle,
    schluessel: teamSchluessel(m.vorname, m.nachname),
    werte: bestandWerte(m, namen),
  }));
  const getroffen = new Set<string>();
  const zeilen = ergebnis.zeilen.map((z) => {
    if (!z.mitglied) return z;
    const a = abgleichen(
      { externeId: z.mitglied.externe_id, schluessel: teamSchluessel(z.mitglied.vorname, z.mitglied.nachname), werte: dateiWerte(z.mitglied, erkannt, namen) },
      vergleich,
      quelle,
      TEAM_ABGLEICH_FELDER
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
      nichtMehrInDatei: nichtMehrInDatei(vergleich, getroffen, quelle).map((b) => `${b.werte.vorname ?? ""} ${b.werte.nachname ?? ""}`.trim()),
    },
  };
}
