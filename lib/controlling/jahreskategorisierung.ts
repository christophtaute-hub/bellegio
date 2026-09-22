import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { resolveBandAmStichtag, type HistorieEintrag } from "@/lib/kinder/buchungszeit-historie";

/**
 * Jährliche Kategorisierung aller Kinder nach vertraglich vereinbarter
 * wöchentlicher Betreuungszeit — für die amtliche Kinder- und
 * Jugendhilfestatistik (Destatis-Erhebung "Kinder in
 * Kindertageseinrichtungen nach vertraglich vereinbarter Betreuungszeit").
 *
 * Wichtiger Hinweis: es gibt KEIN bundesweit einheitliches Stundenraster —
 * Meldebögen unterscheiden sich je Bundesland/Kommune (z.B. nutzt Hamburg
 * bis 10 / 11-20 / 21-25 / 26-30 / 31-40 / 41+ Std., andere Kommunen andere
 * Grenzen). Die hier verwendeten Bänder (10/15/20/.../55 Std., 5-Std.-
 * Schritte) sind die vom Nutzer für die eigene Meldung angegebenen Werte —
 * vor der ersten echten Meldung mit dem zuständigen Jugendamt/Statistischen
 * Landesamt abgleichen (siehe Dokumentationsseite).
 */

export const WOCHENSTUNDEN_BAND_GRENZEN = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
] as const;

export function bandLabelFuerGrenze(grenze: number, istLetzteGrenze: boolean): string {
  if (istLetzteGrenze) return `${grenze} Std. und mehr`;
  const naechsteGrenze =
    WOCHENSTUNDEN_BAND_GRENZEN[WOCHENSTUNDEN_BAND_GRENZEN.indexOf(grenze as never) + 1];
  return `${grenze} bis unter ${naechsteGrenze} Std.`;
}

/** Ordnet eine wöchentliche Stundenzahl der zutreffenden Band-Untergrenze zu
 * (linksoffen/rechtsgeschlossen im Sinne von "X bis unter Y"). Werte unter
 * der kleinsten Grenze (10) werden der kleinsten Grenze zugeordnet, da die
 * Meldung typischerweise erst ab einer Mindestbuchungszeit erfolgt. */
export function bandGrenzeFuerWochenstunden(wochenstunden: number): number {
  let ergebnis: number = WOCHENSTUNDEN_BAND_GRENZEN[0];
  for (const grenze of WOCHENSTUNDEN_BAND_GRENZEN) {
    if (wochenstunden >= grenze) ergebnis = grenze;
  }
  return ergebnis;
}

/** Bayern: Wochenstunden aus der täglichen Buchungszeit-Band-Spanne
 * ableiten (Mittelwert von min/max, offene Obergrenze ">9h" nutzt min_hours)
 * × 5 Betreuungstage/Woche — eine Näherung, da nur die tägliche Buchungszeit
 * erfasst wird, nicht die wöchentliche Stundenzahl direkt. */
export function wochenstundenAusBuchungszeitBand(band: {
  min_hours: number;
  max_hours: number | null;
}): number {
  const taeglich = band.max_hours
    ? (band.min_hours + band.max_hours) / 2
    : band.min_hours;
  return taeglich * 5;
}

/** BW/NRW: booking_time_bands ist dort bereits wöchentlich (kein ×5 wie in
 * Bayern) — einfacher Mittelwert von min/max. */
export function wochenstundenAusWoechentlichemBand(band: {
  min_hours: number;
  max_hours: number | null;
}): number {
  return band.max_hours ? (band.min_hours + band.max_hours) / 2 : band.min_hours;
}

export type JahreskategorisierungEintrag = {
  wochenstunden: number;
  hatBehinderung: boolean;
};

export type JahreskategorisierungBand = {
  grenze: number;
  label: string;
  anzahlKinder: number;
  davonMitBehinderung: number;
};

export function buildJahreskategorisierung(
  eintraege: JahreskategorisierungEintrag[]
): JahreskategorisierungBand[] {
  const zaehlung = new Map<number, { gesamt: number; behinderung: number }>();
  for (const grenze of WOCHENSTUNDEN_BAND_GRENZEN) {
    zaehlung.set(grenze, { gesamt: 0, behinderung: 0 });
  }

  for (const eintrag of eintraege) {
    const grenze = bandGrenzeFuerWochenstunden(eintrag.wochenstunden);
    const bucket = zaehlung.get(grenze)!;
    bucket.gesamt += 1;
    if (eintrag.hatBehinderung) bucket.behinderung += 1;
  }

  return WOCHENSTUNDEN_BAND_GRENZEN.map((grenze, i) => ({
    grenze,
    label: bandLabelFuerGrenze(grenze, i === WOCHENSTUNDEN_BAND_GRENZEN.length - 1),
    anzahlKinder: zaehlung.get(grenze)!.gesamt,
    davonMitBehinderung: zaehlung.get(grenze)!.behinderung,
  }));
}

type BandSpanne = { min_hours: number; max_hours: number | null };

type KindKategorisierungRoh = {
  hat_behinderung: boolean;
  eintritt: string | null;
  austritt: string | null;
  booking_time_bands: BandSpanne | null;
  gruppen: {
    bw_oeffnungszeit_stunden: number | null;
    nrw_buchungszeit_stunden: number | null;
  } | null;
};

/** Wochenstunden eines Kindes für die Bandzuordnung — in allen drei
 * Bundesländern zuerst aus der pro Kind erfassten Buchungszeit (Bayern:
 * täglich ×5, BW/NRW: bereits wöchentlich); nur wenn dort nichts hinterlegt
 * ist, dient die Gruppen-Konfiguration als Näherung (BW: Öffnungszeit ×5,
 * NRW: Buchungszeit-Stunden). null = nicht zuordenbar. */
export function wochenstundenFuerKind(
  kind: Pick<KindKategorisierungRoh, "booking_time_bands" | "gruppen">,
  bundeslandCode: string
): number | null {
  const band = kind.booking_time_bands;
  if (bundeslandCode === "by") {
    return band ? wochenstundenAusBuchungszeitBand(band) : null;
  }
  if (band) return wochenstundenAusWoechentlichemBand(band);
  const gruppe = kind.gruppen;
  if (bundeslandCode === "bw" && gruppe?.bw_oeffnungszeit_stunden) {
    return gruppe.bw_oeffnungszeit_stunden * 5;
  }
  if (bundeslandCode === "nrw" && gruppe?.nrw_buchungszeit_stunden) {
    return gruppe.nrw_buchungszeit_stunden;
  }
  return null;
}

export type KategorisierungsMonat = {
  /** Erster Tag des Monats (YYYY-MM-01) — zugleich der Stichtag der Zählung. */
  monat: string;
  baender: JahreskategorisierungBand[];
  nichtZugeordnet: number;
};

/** Löst je Kind und Monat das damals gültige Buchungszeit-Band über die Historie auf, statt immer das aktuell
 * hinterlegte Band zu nehmen — sonst würde eine spätere Buchungszeit-Änderung frühere Monate rückwirkend
 * verfälschen. Gleiche „letzter Wert vor Stichtag“-Logik wie die Datenbankfunktion `kinder_presence_at_date`. */
function bandAmStichtagAufloesen(
  kindId: string,
  historieByKind: Map<string, HistorieEintrag[]>,
  baenderById: Map<string, BandSpanne>,
  stichtag: string
): BandSpanne | null {
  const bandId = resolveBandAmStichtag(historieByKind.get(kindId) ?? [], stichtag);
  return bandId ? (baenderById.get(bandId) ?? null) : null;
}

/**
 * Kalenderjahr-Übersicht Januar bis Dezember: für jeden Monat (Stichtag =
 * 1. des Monats, wie in der Forecast-Tabelle) die Kinder je Wochenstunden-Band
 * inklusive der Kinder mit I-Status. Die Buchungszeit wird für jeden Monat aus
 * der Historie zum jeweiligen Stichtag aufgelöst, nicht aus dem aktuellen Wert.
 *
 * Der amtliche Erhebungsstichtag der Kinder- und Jugendhilfestatistik ist der
 * 1. März — er steckt als Märzspalte in dieser Übersicht.
 */
export async function getKalenderjahrKategorisierung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  jahr: number
): Promise<KategorisierungsMonat[]> {
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  const { data } = await supabase
    .from("kinder")
    .select(
      "id, hat_behinderung, eintritt, austritt, gruppen(bw_oeffnungszeit_stunden, nrw_buchungszeit_stunden)"
    )
    .eq("einrichtung_id", einrichtungId)
    .is("archived_at", null)
    .neq("status", "nachruecker")
    .not("eintritt", "is", null)
    .lte("eintritt", `${jahr}-12-01`)
    .or(`austritt.is.null,austritt.gt.${jahr}-01-01`);

  const kinder = data ?? [];
  const kindIds = kinder.map((k) => k.id);

  const [{ data: historieRows }, { data: baender }] = await Promise.all([
    kindIds.length > 0
      ? supabase.from("kind_buchungszeit_historie").select("kind_id, buchungszeit_band_id, gueltig_ab").in("kind_id", kindIds)
      : Promise.resolve({ data: [] as { kind_id: string; buchungszeit_band_id: string | null; gueltig_ab: string }[] }),
    supabase.from("booking_time_bands").select("id, min_hours, max_hours").eq("bundesland_code", bundeslandCode),
  ]);

  const historieByKind = new Map<string, HistorieEintrag[]>();
  for (const row of historieRows ?? []) {
    const liste = historieByKind.get(row.kind_id) ?? [];
    liste.push({ gueltig_ab: row.gueltig_ab, buchungszeit_band_id: row.buchungszeit_band_id });
    historieByKind.set(row.kind_id, liste);
  }
  const baenderById = new Map((baender ?? []).map((b) => [b.id, { min_hours: b.min_hours, max_hours: b.max_hours }]));

  return Array.from({ length: 12 }, (_, i) => {
    const monat = `${jahr}-${String(i + 1).padStart(2, "0")}-01`;
    const eintraege: JahreskategorisierungEintrag[] = [];
    let nichtZugeordnet = 0;

    for (const kind of kinder) {
      const istAnwesend =
        kind.eintritt !== null &&
        kind.eintritt <= monat &&
        (kind.austritt === null || kind.austritt > monat);
      if (!istAnwesend) continue;

      const band = bandAmStichtagAufloesen(kind.id, historieByKind, baenderById, monat);
      const wochenstunden = wochenstundenFuerKind({ booking_time_bands: band, gruppen: kind.gruppen }, bundeslandCode);
      if (wochenstunden === null) {
        nichtZugeordnet += 1;
        continue;
      }
      eintraege.push({ wochenstunden, hatBehinderung: kind.hat_behinderung });
    }

    return { monat, baender: buildJahreskategorisierung(eintraege), nichtZugeordnet };
  });
}
