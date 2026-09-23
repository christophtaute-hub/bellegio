import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Baden-Württemberg rechnet strukturell anders als Bayern: kein
 * Anstellungsschlüssel-Verhältnis, keine Gewichtung pro Kind. Stattdessen
 * gibt §1 KiTaVO einen festen VZÄ-Sollwert je Gruppentyp (Betriebsform ×
 * Altersmischung) bei einer Referenz-Öffnungszeit vor. Quelle: KiTaVO
 * Baden-Württemberg (konsolidierte Fassung 2023) §1, sowie die
 * KVJS-„Ausführungshinweise zur KiTaVO und Berechnungshilfe zum
 * Personalbedarf“ des KVJS-Landesjugendamts (dort exakt vorgerechnet für
 * alle Betriebsformen).
 *
 * §1 Abs. 2 KiTaVO: bei allen Betriebsformen außer der reinen
 * Halbtags-/Regelgruppe ohne Altersmischung (§1 Abs.1 Satz1 Nr.1a/2a)
 * besteht die tägliche Öffnungszeit aus Hauptbetreuungszeit + Randzeit
 * (gesetzlicher Standardwert: 1 Stunde) — während der Hauptbetreuungszeit
 * sind zwei Fachkräfte, während der Randzeit eine Fachkraft vorzuhalten.
 * Weicht die tatsächliche Randzeit vom Standardwert ab, ändert sich der
 * Mindestpersonalschlüssel entsprechend (siehe `berechneSollVzaeBW`).
 * Bei der reinen Halbtags-/Regelgruppe ohne Altersmischung gilt weiterhin
 * ein einzelner Stellen-pro-Stunde-Satz über die gesamte Öffnungszeit,
 * ohne Randzeit-Unterscheidung.
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
  /** null = gesetzlicher Standardwert (1 Stunde, §1 Abs.2 Satz4 KiTaVO). Ohne Bedeutung bei der
   * reinen Halbtags-/Regelgruppe ohne Altersmischung (keine Randzeit-Unterscheidung dort). */
  bwRandzeitStunden: number | null;
};

/** Gesetzlicher Standardwert für die Randzeit, § 1 Abs. 2 Satz 4 KiTaVO. */
export const BW_STANDARD_RANDZEIT_STUNDEN = 1;

/** Nur die reine Halbtags-/Regelgruppe ohne Altersmischung (§1 Abs.1 Satz1 Nr.1a/2a) rechnet mit
 * einem einzelnen Stellen-pro-Stunde-Satz über die gesamte Öffnungszeit — alle anderen
 * Betriebsformen (auch HT/RG MIT Altersmischung) trennen nach Hauptbetreuungszeit/Randzeit. */
export function hatRandzeitSplit(betriebsform: string, altersmischung: boolean): boolean {
  const reineHalbtagsOderRegelgruppe =
    (betriebsform === "halbtagsgruppe" || betriebsform === "regelgruppe") && !altersmischung;
  return !reineHalbtagsOderRegelgruppe;
}

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

  if (!hatRandzeitSplit(gruppe.bwBetriebsform, gruppe.bwAltersmischung)) {
    // Reine Halbtags-/Regelgruppe ohne Altersmischung: ein Stellen-pro-Stunde-Satz, linear zur
    // Gesamt-Öffnungszeit (keine Randzeit-Unterscheidung, §1 Abs.1 Satz1 Nr.1a/2a KiTaVO).
    const deltaStunden = oeffnungszeit - row.referenzOeffnungszeitStunden;
    return row.referenzVzae + deltaStunden * row.stellenProStunde;
  }

  // Alle anderen Betriebsformen: Öffnungszeit = Hauptbetreuungszeit + Randzeit (§1 Abs.2 Satz4
  // KiTaVO). Während der Hauptbetreuungszeit sind zwei Fachkräfte, während der Randzeit eine
  // Fachkraft vorzuhalten — die Hauptbetreuungszeit-Rate ist also exakt das Doppelte der
  // Randzeit-Rate. Beide Raten lassen sich aus dem vorhandenen Referenzwert ableiten: bei der
  // Referenz-Öffnungszeit verteilt sich referenzVzae auf (referenzOeffnungszeit − 1 Std.)
  // Hauptbetreuung + 1 Std. Randzeit (der gesetzliche Standardwert), also
  //   referenzVzae = randzeitRate × (2 × referenzHauptbetreuungStunden + referenzRandzeitStunden).
  // Weicht die tatsächliche Randzeit vom Standardwert ab, verschiebt das nur, wie viele Stunden
  // mit welcher Rate gezählt werden — die insgesamt benötigten VZÄ ändern sich entsprechend.
  const randzeitStunden = gruppe.bwRandzeitStunden ?? BW_STANDARD_RANDZEIT_STUNDEN;
  const referenzHauptbetreuungStunden = row.referenzOeffnungszeitStunden - BW_STANDARD_RANDZEIT_STUNDEN;
  const randzeitRate = row.referenzVzae / (2 * referenzHauptbetreuungStunden + BW_STANDARD_RANDZEIT_STUNDEN);
  const hauptbetreuungRate = 2 * randzeitRate;
  const hauptbetreuungStunden = oeffnungszeit - randzeitStunden;

  return hauptbetreuungStunden * hauptbetreuungRate + randzeitStunden * randzeitRate;
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
