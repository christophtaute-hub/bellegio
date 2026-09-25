import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";

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

export type NRWPersonalstundenVersion = NRWPersonalstundenRow & Versioniert;

function gruppenSchluessel(gruppenform: string, buchungszeitStunden: number): string {
  return `${gruppenform}::${buchungszeitStunden}`;
}

/** Lädt alle je erfassten Fassungen (aktuelle Zeile + Historie), gruppiert nach Gruppenform ×
 * Buchungszeit-Stunden — Milestone 29b, zentrales versioniertes Bundesland-Regelwerk. Wird
 * stichtagsunabhängig einmal geladen; welche Fassung je Gruppe am Stichtag galt, löst
 * resolveNRWPersonalstundenTabelleAmStichtag rein in-memory auf. */
export async function getNRWPersonalstundenVersionen(
  supabase: SupabaseClient<Database>
): Promise<Map<string, NRWPersonalstundenVersion[]>> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase
      .from("nrw_personalstunden")
      .select("gruppenform, buchungszeit_stunden, fachkraft_stunden, ergaenzungskraft_stunden, leitungsfreistellung_stunden, gueltig_ab")
      .eq("bundesland_code", "nrw"),
    supabase
      .from("nrw_personalstunden_historie")
      .select("gruppenform, buchungszeit_stunden, fachkraft_stunden, ergaenzungskraft_stunden, leitungsfreistellung_stunden, gueltig_ab, gueltig_bis")
      .eq("bundesland_code", "nrw"),
  ]);

  const versionenByGroup = new Map<string, NRWPersonalstundenVersion[]>();
  const anhaengen = (schluessel: string, version: NRWPersonalstundenVersion) => {
    const liste = versionenByGroup.get(schluessel);
    if (liste) liste.push(version);
    else versionenByGroup.set(schluessel, [version]);
  };

  for (const h of historie ?? []) {
    anhaengen(gruppenSchluessel(h.gruppenform, h.buchungszeit_stunden), {
      gruppenform: h.gruppenform,
      buchungszeitStunden: h.buchungszeit_stunden,
      fachkraftStunden: h.fachkraft_stunden,
      ergaenzungskraftStunden: h.ergaenzungskraft_stunden,
      leitungsfreistellungStunden: h.leitungsfreistellung_stunden,
      gueltigAb: h.gueltig_ab,
      gueltigBis: h.gueltig_bis,
    });
  }
  for (const row of live ?? []) {
    anhaengen(gruppenSchluessel(row.gruppenform, row.buchungszeit_stunden), {
      gruppenform: row.gruppenform,
      buchungszeitStunden: row.buchungszeit_stunden,
      fachkraftStunden: row.fachkraft_stunden,
      ergaenzungskraftStunden: row.ergaenzungskraft_stunden,
      leitungsfreistellungStunden: row.leitungsfreistellung_stunden,
      gueltigAb: row.gueltig_ab,
      gueltigBis: null,
    });
  }
  return versionenByGroup;
}

/** Reine Funktion: löst je Gruppe (Gruppenform × Buchungszeit) die zum Stichtag gültige Fassung auf
 * und liefert wieder die bestehende NRWPersonalstundenRow[]-Form, die findeNRWZeile schon kennt.
 * Fällt bei einer Lücke auf die älteste bekannte Fassung zurück (siehe anstellungsschluessel.ts für
 * die Begründung) — eine leere Gruppe würde sonst in der Ampel-Berechnung als 0 Std. Soll gelesen. */
export function resolveNRWPersonalstundenTabelleAmStichtag(
  versionenByGroup: Map<string, NRWPersonalstundenVersion[]>,
  stichtag: string
): NRWPersonalstundenRow[] {
  const zeilen: NRWPersonalstundenRow[] = [];
  for (const versionen of versionenByGroup.values()) {
    const treffer = versionAmStichtagMitFallback(versionen, stichtag);
    if (treffer) {
      zeilen.push({
        gruppenform: treffer.gruppenform,
        buchungszeitStunden: treffer.buchungszeitStunden,
        fachkraftStunden: treffer.fachkraftStunden,
        ergaenzungskraftStunden: treffer.ergaenzungskraftStunden,
        leitungsfreistellungStunden: treffer.leitungsfreistellungStunden,
      });
    }
  }
  return zeilen;
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
