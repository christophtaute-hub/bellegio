import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * NRW (KiBiz) rechnet strukturell anders als Bayern und anders als
 * Baden-Württemberg: feste Personal-Wochenstunden je Gruppenform (I/II/III)
 * × Buchungszeit-Band (25/35/45 Std./Woche) — keine Gewichtung pro Kind,
 * Alter wird ausschließlich über die Gruppenform abgebildet (GF II = reine
 * Krippe, GF I = altersgemischt, GF III = reine Ü3). Quelle: KiBiz NRW
 * (Stand 01.08.2022), Anlage zu §33 Abs. 1 KiBiz — die genaue Stunden-
 * Tabelle stammt aus Praktiker-Quellen, nicht aus der Primär-PDF direkt
 * (Font-Extraktion fehlgeschlagen), siehe Dokumentationsseite.
 *
 * Kinder mit (drohender) Behinderung: §26 Abs. 3 KiBiz verlangt nur
 * qualitativ "besonderen Bedarf ... zu berücksichtigen" — kein
 * Gewichtungsfaktor wie in Bayern, sondern erhöhte Kindpauschale
 * (Förderung) + ggf. separate Eingliederungshilfe/KiTa-Assistenz.
 */
export type NRWPersonalstundenRow = {
  gruppenform: string;
  buchungszeitStunden: number;
  fachkraftStunden: number;
  ergaenzungskraftStunden: number;
  leitungsfreistellungStunden: number;
};

export async function getNRWPersonalstundenTabelle(
  supabase: SupabaseClient<Database>
): Promise<NRWPersonalstundenRow[]> {
  const { data } = await supabase
    .from("nrw_personalstunden")
    .select(
      "gruppenform, buchungszeit_stunden, fachkraft_stunden, ergaenzungskraft_stunden, leitungsfreistellung_stunden"
    )
    .eq("bundesland_code", "nrw");

  return (data ?? []).map((row) => ({
    gruppenform: row.gruppenform,
    buchungszeitStunden: row.buchungszeit_stunden,
    fachkraftStunden: row.fachkraft_stunden,
    ergaenzungskraftStunden: row.ergaenzungskraft_stunden,
    leitungsfreistellungStunden: row.leitungsfreistellung_stunden,
  }));
}

export type NRWGruppe = {
  id: string;
  name: string;
  nrwGruppenform: string | null;
  nrwBuchungszeitStunden: number | null;
};

export type NRWGruppenErgebnis = {
  gruppeId: string;
  gruppeName: string;
  gruppenform: string | null;
  sollFachkraftStunden: number;
  sollErgaenzungskraftStunden: number;
  sollLeitungsfreistellungStunden: number;
};

export type NRWPersonalplanung = {
  gruppen: NRWGruppenErgebnis[];
  sollFachkraftStundenGesamt: number;
  sollErgaenzungskraftStundenGesamt: number;
  istFk: number;
  istEk: number;
  ampel: "gruen" | "gelb" | "rot";
};

/** Reine Funktion, ohne DB-Zugriff testbar. */
export function findeNRWZeile(
  gruppe: NRWGruppe,
  tabelle: NRWPersonalstundenRow[]
): NRWPersonalstundenRow | undefined {
  if (!gruppe.nrwGruppenform || gruppe.nrwBuchungszeitStunden === null) {
    return undefined;
  }
  return tabelle.find(
    (r) =>
      r.gruppenform === gruppe.nrwGruppenform &&
      r.buchungszeitStunden === gruppe.nrwBuchungszeitStunden
  );
}

export function buildNRWPersonalplanung(
  gruppen: NRWGruppe[],
  tabelle: NRWPersonalstundenRow[],
  istFk: number,
  istEk: number
): NRWPersonalplanung {
  const gruppenErgebnisse = gruppen.map((gruppe) => {
    const zeile = findeNRWZeile(gruppe, tabelle);
    return {
      gruppeId: gruppe.id,
      gruppeName: gruppe.name,
      gruppenform: gruppe.nrwGruppenform,
      sollFachkraftStunden:
        (zeile?.fachkraftStunden ?? 0) +
        (zeile?.leitungsfreistellungStunden ?? 0),
      sollErgaenzungskraftStunden: zeile?.ergaenzungskraftStunden ?? 0,
      sollLeitungsfreistellungStunden: zeile?.leitungsfreistellungStunden ?? 0,
    };
  });

  const sollFachkraftStundenGesamt = gruppenErgebnisse.reduce(
    (sum, g) => sum + g.sollFachkraftStunden,
    0
  );
  const sollErgaenzungskraftStundenGesamt = gruppenErgebnisse.reduce(
    (sum, g) => sum + g.sollErgaenzungskraftStunden,
    0
  );

  const fkOk = istFk >= sollFachkraftStundenGesamt;
  const ekOk = istEk >= sollErgaenzungskraftStundenGesamt;

  const ampel: NRWPersonalplanung["ampel"] =
    sollFachkraftStundenGesamt === 0 && sollErgaenzungskraftStundenGesamt === 0
      ? "gruen"
      : fkOk && ekOk
        ? "gruen"
        : fkOk || ekOk
          ? "gelb"
          : "rot";

  return {
    gruppen: gruppenErgebnisse,
    sollFachkraftStundenGesamt,
    sollErgaenzungskraftStundenGesamt,
    istFk,
    istEk,
    ampel,
  };
}
