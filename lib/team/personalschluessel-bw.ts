import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { versionAmStichtagMitFallback, type Versioniert } from "@/lib/regelwerk/verlauf";

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

export type BWPersonalschluesselVersion = BWPersonalschluesselRow & Versioniert;

function gruppenSchluessel(betriebsform: string, altersmischung: boolean): string {
  return `${betriebsform}::${altersmischung}`;
}

/** Lädt alle je erfassten Fassungen (aktuelle Zeile + Historie), gruppiert nach Betriebsform ×
 * Altersmischung — Milestone 29b, zentrales versioniertes Bundesland-Regelwerk. Wird
 * stichtagsunabhängig einmal geladen; welche Fassung je Gruppe am Stichtag galt, löst
 * resolveBWPersonalschluesselTabelleAmStichtag rein in-memory auf. */
export async function getBWPersonalschluesselVersionen(
  supabase: SupabaseClient<Database>
): Promise<Map<string, BWPersonalschluesselVersion[]>> {
  const [{ data: live }, { data: historie }] = await Promise.all([
    supabase
      .from("bw_personalschluessel")
      .select("betriebsform, altersmischung, referenz_oeffnungszeit_stunden, referenz_vzae, stellen_pro_stunde, gueltig_ab")
      .eq("bundesland_code", "bw"),
    supabase
      .from("bw_personalschluessel_historie")
      .select("betriebsform, altersmischung, referenz_oeffnungszeit_stunden, referenz_vzae, stellen_pro_stunde, gueltig_ab, gueltig_bis")
      .eq("bundesland_code", "bw"),
  ]);

  const versionenByGroup = new Map<string, BWPersonalschluesselVersion[]>();
  const anhaengen = (schluessel: string, version: BWPersonalschluesselVersion) => {
    const liste = versionenByGroup.get(schluessel);
    if (liste) liste.push(version);
    else versionenByGroup.set(schluessel, [version]);
  };

  for (const h of historie ?? []) {
    anhaengen(gruppenSchluessel(h.betriebsform, h.altersmischung), {
      betriebsform: h.betriebsform,
      altersmischung: h.altersmischung,
      referenzOeffnungszeitStunden: h.referenz_oeffnungszeit_stunden,
      referenzVzae: h.referenz_vzae,
      stellenProStunde: h.stellen_pro_stunde,
      gueltigAb: h.gueltig_ab,
      gueltigBis: h.gueltig_bis,
    });
  }
  for (const row of live ?? []) {
    anhaengen(gruppenSchluessel(row.betriebsform, row.altersmischung), {
      betriebsform: row.betriebsform,
      altersmischung: row.altersmischung,
      referenzOeffnungszeitStunden: row.referenz_oeffnungszeit_stunden,
      referenzVzae: row.referenz_vzae,
      stellenProStunde: row.stellen_pro_stunde,
      gueltigAb: row.gueltig_ab,
      gueltigBis: null,
    });
  }
  return versionenByGroup;
}

/** Reine Funktion: löst je Gruppe (Betriebsform × Altersmischung) die zum Stichtag gültige Fassung
 * auf und liefert wieder die bestehende BWPersonalschluesselRow[]-Form, die berechneSollVzaeBW schon
 * kennt. Fällt bei einer Lücke auf die älteste bekannte Fassung zurück (siehe anstellungsschluessel.ts
 * für die Begründung) — eine leere Gruppe würde sonst in der Ampel-Berechnung als 0 VZÄ Soll gelesen. */
export function resolveBWPersonalschluesselTabelleAmStichtag(
  versionenByGroup: Map<string, BWPersonalschluesselVersion[]>,
  stichtag: string
): BWPersonalschluesselRow[] {
  const zeilen: BWPersonalschluesselRow[] = [];
  for (const versionen of versionenByGroup.values()) {
    const treffer = versionAmStichtagMitFallback(versionen, stichtag);
    if (treffer) {
      zeilen.push({
        betriebsform: treffer.betriebsform,
        altersmischung: treffer.altersmischung,
        referenzOeffnungszeitStunden: treffer.referenzOeffnungszeitStunden,
        referenzVzae: treffer.referenzVzae,
        stellenProStunde: treffer.stellenProStunde,
      });
    }
  }
  return zeilen;
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
  // Geklammert auf die Öffnungszeit: eine (auch nur per Standardwert angenommene) Randzeit kann
  // nie länger sein als die Gruppe überhaupt geöffnet hat — sonst würde die Hauptbetreuungszeit
  // rechnerisch negativ (nur bei unrealistisch kurzen Öffnungszeiten unter 1 Std. relevant).
  const randzeitStunden = Math.min(gruppe.bwRandzeitStunden ?? BW_STANDARD_RANDZEIT_STUNDEN, oeffnungszeit);
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
