import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Baden-Württemberg rechnet strukturell anders als Bayern: kein
 * Anstellungsschlüssel-Verhältnis, keine Gewichtung pro Kind. Stattdessen
 * gibt §1 KiTaVO einen festen VZÄ-Sollwert je Gruppentyp (Betriebsform ×
 * Altersmischung) bei einer Referenz-Öffnungszeit vor, der bei abweichender
 * Öffnungszeit linear skaliert wird. Quelle: KiTaVO Baden-Württemberg
 * (konsolidierte Fassung 2023) §1, bestätigt durch KVJS-Rundschreiben
 * 14/2021 Anlage 2 — dort exakt vorgerechnet für Regelgruppe ohne
 * Altersmischung (1,8 VZÄ ÷ 6 Std. = 0,300 Stellen/Std.); die übrigen
 * Betriebsformen folgen laut Herleitung derselben linearen Regel, sind
 * aber nicht einzeln primärquellenbestätigt (siehe Dokumentationsseite).
 *
 * Kinder mit Behinderung: §1 Abs. 2 KiTaVO schließt den Mehrbedarf
 * ausdrücklich vom Mindestpersonalschlüssel aus — kein Gewichtungsfaktor
 * wie in Bayern, sondern Einzelfallprüfung + separate Eingliederungshilfe.
 * Fachkraftquote: keine Prozent-Vorgabe, Basis ist faktisch 100 % Fachkraft.
 */
export type BWPersonalschluesselRow = {
  betriebsform: string;
  altersmischung: boolean;
  referenzOeffnungszeitStunden: number;
  referenzVzae: number;
  stellenProStunde: number;
};

export async function getBWPersonalschluesselTabelle(
  supabase: SupabaseClient<Database>
): Promise<BWPersonalschluesselRow[]> {
  const { data } = await supabase
    .from("bw_personalschluessel")
    .select(
      "betriebsform, altersmischung, referenz_oeffnungszeit_stunden, referenz_vzae, stellen_pro_stunde"
    )
    .eq("bundesland_code", "bw");

  return (data ?? []).map((row) => ({
    betriebsform: row.betriebsform,
    altersmischung: row.altersmischung,
    referenzOeffnungszeitStunden: row.referenz_oeffnungszeit_stunden,
    referenzVzae: row.referenz_vzae,
    stellenProStunde: row.stellen_pro_stunde,
  }));
}

export type BWGruppe = {
  id: string;
  name: string;
  bwBetriebsform: string | null;
  bwAltersmischung: boolean;
  bwOeffnungszeitStunden: number | null;
};

export type BWGruppenErgebnis = {
  gruppeId: string;
  gruppeName: string;
  betriebsform: string | null;
  sollVzae: number;
};

export type BWPersonalplanung = {
  gruppen: BWGruppenErgebnis[];
  sollVzaeGesamt: number;
  istVzaeGesamt: number;
  ampel: "gruen" | "gelb" | "rot";
}

/** Reine Funktion, ohne DB-Zugriff testbar. */
export function berechneSollVzaeBW(
  gruppe: BWGruppe,
  tabelle: BWPersonalschluesselRow[]
): number {
  if (!gruppe.bwBetriebsform) return 0;
  const row = tabelle.find(
    (r) =>
      r.betriebsform === gruppe.bwBetriebsform &&
      r.altersmischung === gruppe.bwAltersmischung
  );
  if (!row) return 0;

  const oeffnungszeit =
    gruppe.bwOeffnungszeitStunden ?? row.referenzOeffnungszeitStunden;
  const deltaStunden = oeffnungszeit - row.referenzOeffnungszeitStunden;
  return row.referenzVzae + deltaStunden * row.stellenProStunde;
}

export function buildBWPersonalplanung(
  gruppen: BWGruppe[],
  tabelle: BWPersonalschluesselRow[],
  istAzGesamt: number,
  vollzeitWochenstunden: number
): BWPersonalplanung {
  const gruppenErgebnisse = gruppen.map((gruppe) => ({
    gruppeId: gruppe.id,
    gruppeName: gruppe.name,
    betriebsform: gruppe.bwBetriebsform,
    sollVzae: berechneSollVzaeBW(gruppe, tabelle),
  }));

  const sollVzaeGesamt = gruppenErgebnisse.reduce(
    (sum, g) => sum + g.sollVzae,
    0
  );
  const istVzaeGesamt =
    vollzeitWochenstunden > 0 ? istAzGesamt / vollzeitWochenstunden : 0;

  const ampel =
    sollVzaeGesamt === 0
      ? "gruen"
      : istVzaeGesamt >= sollVzaeGesamt
        ? "gruen"
        : istVzaeGesamt >= sollVzaeGesamt * 0.9
          ? "gelb"
          : "rot";

  return { gruppen: gruppenErgebnisse, sollVzaeGesamt, istVzaeGesamt, ampel };
}
