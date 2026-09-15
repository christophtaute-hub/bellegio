import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

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

/**
 * Amtlicher Erhebungsstichtag der Kinder- und Jugendhilfestatistik ist der
 * 1. März — als Stichtag für die Jahreskategorisierung übernommen.
 */
export async function getJahreskategorisierung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  jahr: number
): Promise<{ stichtag: string; baender: JahreskategorisierungBand[]; nichtZugeordnet: number }> {
  const stichtag = `${jahr}-03-01`;

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  let query = supabase
    .from("kinder")
    .select(
      bundeslandCode === "by"
        ? "hat_behinderung, booking_time_bands(min_hours, max_hours)"
        : "hat_behinderung, gruppen(bw_oeffnungszeit_stunden, nrw_buchungszeit_stunden)"
    )
    .eq("einrichtung_id", einrichtungId)
    .is("archived_at", null)
    .neq("status", "nachruecker")
    .not("eintritt", "is", null)
    .lte("eintritt", stichtag);
  query = query.or(`austritt.is.null,austritt.gt.${stichtag}`);

  const { data } = await query;

  const eintraege: JahreskategorisierungEintrag[] = [];
  let nichtZugeordnet = 0;

  for (const kind of data ?? []) {
    let wochenstunden: number | null = null;
    if (bundeslandCode === "by") {
      const band = (kind as { booking_time_bands: { min_hours: number; max_hours: number | null } | null })
        .booking_time_bands;
      if (band) wochenstunden = wochenstundenAusBuchungszeitBand(band);
    } else {
      const gruppe = (
        kind as {
          gruppen: {
            bw_oeffnungszeit_stunden: number | null;
            nrw_buchungszeit_stunden: number | null;
          } | null;
        }
      ).gruppen;
      if (bundeslandCode === "bw" && gruppe?.bw_oeffnungszeit_stunden) {
        wochenstunden = gruppe.bw_oeffnungszeit_stunden * 5;
      } else if (bundeslandCode === "nrw" && gruppe?.nrw_buchungszeit_stunden) {
        wochenstunden = gruppe.nrw_buchungszeit_stunden;
      }
    }

    if (wochenstunden === null) {
      nichtZugeordnet += 1;
      continue;
    }
    eintraege.push({
      wochenstunden,
      hatBehinderung: (kind as { hat_behinderung: boolean }).hat_behinderung,
    });
  }

  return {
    stichtag,
    baender: buildJahreskategorisierung(eintraege),
    nichtZugeordnet,
  };
}
