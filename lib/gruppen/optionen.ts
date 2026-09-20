import { GRUPPENART_LABEL } from "@/lib/constants";

export const GRUPPENARTEN = Object.keys(GRUPPENART_LABEL);

export const BW_BETRIEBSFORMEN = [
  { value: "regelgruppe", label: "Regelgruppe", altersmischungMoeglich: true },
  { value: "halbtagsgruppe", label: "Halbtagsgruppe", altersmischungMoeglich: true },
  { value: "verlaengerte_oeffnungszeit", label: "Verlängerte Öffnungszeit (VÖ)", altersmischungMoeglich: true },
  { value: "ganztagsgruppe", label: "Ganztagsgruppe (GT)", altersmischungMoeglich: false },
  { value: "kinderkrippe", label: "Kinderkrippe", altersmischungMoeglich: false },
] as const;

/** NRW: GF II = reine Krippe, GF I = altersgemischt, GF III = reine Ü3 (Anlage zu § 33 KiBiz). */
export const NRW_GRUPPENFORMEN = [
  { value: "I", label: "Gruppenform I (altersgemischt)" },
  { value: "II", label: "Gruppenform II (Krippe, unter 3 Jahre)" },
  { value: "III", label: "Gruppenform III (ab 3 Jahren)" },
] as const;

export const NRW_BUCHUNGSZEITEN = [25, 35, 45] as const;

export type GruppeInput = {
  name: string;
  gruppenart: string;
  sollplatze: number;
  bwBetriebsform: string | null;
  bwAltersmischung: boolean;
  bwOeffnungszeitStunden: number | null;
  nrwGruppenform: string | null;
  nrwBuchungszeitStunden: number | null;
};

/** Die für das Bundesland passenden DB-Felder; alles Fremde wird auf null/false gesetzt,
 * damit keine Werte eines anderen Rechenmodells in der Gruppe hängen bleiben. */
export type GruppeDbFelder = {
  name: string;
  gruppenart: string;
  sollplatze: number;
  bw_betriebsform: string | null;
  bw_altersmischung: boolean;
  bw_oeffnungszeit_stunden: number | null;
  nrw_gruppenform: string | null;
  nrw_buchungszeit_stunden: number | null;
};

export function pruefeGruppe(
  input: GruppeInput,
  bundeslandCode: string
): { fehler: string; felder?: undefined } | { fehler: null; felder: GruppeDbFelder } {
  const name = input.name.trim();
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (name.length > 80) return { fehler: "Der Name darf höchstens 80 Zeichen lang sein." };
  if (!GRUPPENARTEN.includes(input.gruppenart)) return { fehler: "Bitte eine Gruppenart auswählen." };
  if (!Number.isInteger(input.sollplatze) || input.sollplatze < 1 || input.sollplatze > 200) {
    return { fehler: "Bitte eine ganze Zahl von Sollplätzen zwischen 1 und 200 angeben." };
  }

  const felder: GruppeDbFelder = {
    name,
    gruppenart: input.gruppenart,
    sollplatze: input.sollplatze,
    bw_betriebsform: null,
    bw_altersmischung: false,
    bw_oeffnungszeit_stunden: null,
    nrw_gruppenform: null,
    nrw_buchungszeit_stunden: null,
  };

  if (bundeslandCode === "bw") {
    const form = BW_BETRIEBSFORMEN.find((f) => f.value === input.bwBetriebsform);
    if (!form) return { fehler: "Bitte die Betriebsform der Gruppe auswählen." };
    const stunden = input.bwOeffnungszeitStunden;
    if (stunden === null || !(stunden > 0 && stunden <= 14)) {
      return { fehler: "Bitte die tägliche Öffnungszeit in Stunden angeben (z. B. 7 oder 9,5)." };
    }
    felder.bw_betriebsform = form.value;
    felder.bw_altersmischung = form.altersmischungMoeglich && input.bwAltersmischung;
    felder.bw_oeffnungszeit_stunden = stunden;
  } else if (bundeslandCode === "nrw") {
    if (!NRW_GRUPPENFORMEN.some((f) => f.value === input.nrwGruppenform)) {
      return { fehler: "Bitte die Gruppenform (I, II oder III) auswählen." };
    }
    if (!NRW_BUCHUNGSZEITEN.some((z) => z === input.nrwBuchungszeitStunden)) {
      return { fehler: "Bitte die Buchungszeit (25, 35 oder 45 Stunden) auswählen." };
    }
    felder.nrw_gruppenform = input.nrwGruppenform;
    felder.nrw_buchungszeit_stunden = input.nrwBuchungszeitStunden;
  }

  return { fehler: null, felder };
}
