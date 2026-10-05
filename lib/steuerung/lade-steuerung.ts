import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { buildForecastMonths, type ForecastMonth } from "@/lib/forecast/monthly-forecast";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { berechneBelegungsVorschau } from "@/lib/belegung/vorschau";
import { berechnePersonalAusblick, type AusblickAustritt, type AusblickErgebnis } from "@/lib/ausblick/personal-ausblick";
import { ermittleLangzeitHinweise } from "@/lib/team/langzeithinweise";
import { personalKennzahl, type PersonalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import { ladeFinanzenHeute } from "@/lib/finanzen/finanzen-heute";
import type { Ergebnis } from "@/lib/finanzen/ergebnis";
import { AUSFALLZEIT_ART_LABEL } from "@/lib/constants";
import { toIsoDateString } from "@/lib/kita-datum";
import { ersterKritischerMonat, type GruppeStatus } from "@/lib/steuerung/gruppen-status";
import { ladeWechselDaten } from "@/lib/steuerung/wechsel-daten";
import { baueHandlungen, type GruppenVerlauf, type Handlung } from "@/lib/steuerung/handlungen";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

/** Wie weit das Dashboard mindestens vorausschaut (Aufgaben, Gruppen-Ampel, Ausblick). */
export const STEUERUNG_MONATE = 18;

/** Zeiträume, zwischen denen die Vorausschau auf dem Dashboard umschaltbar ist (Monate). */
export const VORAUSSCHAU_OPTIONEN = [3, 6, 9, 12, 18, 24] as const;
export const VORAUSSCHAU_STANDARD = 6;

export type GruppenZeile = GruppeStatus & {
  /** Erster Monat, in dem die Gruppe nicht mehr „in Ordnung“ ist (nur bei belastbaren Gruppenwerten). */
  kritisch: { monat: string; ampel: Ampel } | null;
};

export type SteuerungsDaten = {
  stichtag: string;
  vollzeitWochenstunden: number;
  modell: "bayern" | "bw" | "nrw";
  belegung: { belegt: number; sollplaetze: number; frei: number };
  personal: { kennzahl: PersonalKennzahl; ampel: Ampel };
  finanzen: Ergebnis | null;
  handlungen: Handlung[];
  gruppen: GruppenZeile[];
  zuordnung: { belastbar: boolean; quote: number; ohneGruppeStunden: number };
  ausblick: AusblickErgebnis;
  monate: ForecastMonth[];
};

function monatsErster(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Lädt alles, was das Dashboard braucht — in einem Durchgang: ein Forecast ab dem Stichtag für alle Blöcke (Aufgaben,
 * Gruppen-Ampel, Ausblick), statt jeden Block selbst zu rechnen. */
export async function ladeSteuerung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string,
  optionen: { zeigeFinanzen: boolean; zeigeGehaelter: boolean; monateVoraus?: number }
): Promise<SteuerungsDaten> {
  const [monate, kinderHeute, gruppenRes, kinderRes, einrichtungRes, teamRes, ausfallRes] = await Promise.all([
    buildForecastMonths(supabase, einrichtungId, stichtag, Math.max(STEUERUNG_MONATE, optionen.monateVoraus ?? 0), false, true),
    getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort, ersetzt_kind_id")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .limit(3000),
    supabase
      .from("einrichtungen")
      .select("bundesland_code, vollzeit_wochenstunden, standort_gemeinde, auswaertigen_quote_prozent, foerderung_monatlich_manuell")
      .eq("id", einrichtungId)
      .single(),
    supabase
      .from("team")
      .select("id, vorname, nachname, austritt, wochenstunden")
      .eq("einrichtung_id", einrichtungId)
      .eq("status", "aktiv")
      .is("archived_at", null),
    supabase
      .from("team_ausfallzeiten")
      .select("art, von, bis, team!inner(id, vorname, nachname, einrichtung_id, status)")
      .eq("team.einrichtung_id", einrichtungId)
      .eq("team.status", "aktiv")
      .lte("von", stichtag)
      .or(`bis.is.null,bis.gte.${stichtag}`),
  ]);

  const gruppenListe = gruppenRes.data ?? [];
  const kinderListe = kinderRes.data ?? [];
  const team = teamRes.data ?? [];
  const einrichtung = einrichtungRes.data;
  const vollzeit = Number(einrichtung?.vollzeit_wochenstunden ?? 39);
  const erster = monate[0];
  const start = monatsErster(stichtag);

  // Personal-Ausblick samt Verursachern (Austritte), mit Personal-ID für den Direktlink
  const name = (t: { vorname: string | null; nachname: string | null }) => [t.vorname, t.nachname].filter(Boolean).join(" ");
  const verursacherIds: Record<string, string> = {};
  const austritte: AusblickAustritt[] = team
    .filter((t) => t.austritt !== null && (t.austritt as string) >= start)
    .map((t) => {
      verursacherIds[name(t)] = t.id;
      return { name: name(t), austritt: t.austritt as string, wochenstunden: Number(t.wochenstunden ?? 0) };
    });
  const ausblick = berechnePersonalAusblick(monate, vollzeit, austritte);

  // Gruppen: Verlauf je Monat und Zeile für die Tabelle
  const gruppenVerlauf: GruppenVerlauf[] = gruppenListe.map((g) => ({
    gruppeId: g.id,
    name: g.name,
    belastbar: erster.gruppenStatus.belastbar,
    modell: erster.personal.modell,
    monate: monate.map((m) => {
      const s = m.gruppenStatus.gruppen.find((x) => x.gruppeId === g.id);
      return {
        monat: monatsErster(m.month),
        ampel: s?.personal.ampel ?? "gruen",
        istStunden: s?.personal.istStunden ?? 0,
        sollStunden: s?.personal.sollStunden ?? 0,
        belegt: s?.belegt ?? 0,
        sollplaetze: Number(g.sollplatze),
      };
    }),
  }));
  const gruppen: GruppenZeile[] = erster.gruppenStatus.gruppen.map((g) => {
    const verlauf = gruppenVerlauf.find((v) => v.gruppeId === g.gruppeId);
    return {
      ...g,
      kritisch: erster.gruppenStatus.belastbar && verlauf ? ersterKritischerMonat(verlauf.monate.map((m) => ({ monat: m.monat, ampel: m.ampel }))) : null,
    };
  });

  // Frei werdende Plätze und Nachrücker
  const auswaertigen =
    einrichtung?.bundesland_code === "bw" && einrichtung.standort_gemeinde && einrichtung.auswaertigen_quote_prozent !== null
      ? { standortGemeinde: einrichtung.standort_gemeinde, quoteProzent: Number(einrichtung.auswaertigen_quote_prozent) }
      : undefined;
  const vorschauGruppen = gruppenListe.map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) }));
  const vorschauKinder = kinderListe.map((k) => ({
      id: k.id,
      vorname: k.vorname,
      nachname: k.nachname,
      geburtsdatum: k.geburtsdatum,
      geschlecht: k.geschlecht,
      status: k.status,
      gruppeId: k.gruppe_id,
      eintritt: k.eintritt,
      austritt: k.austritt,
      wohnort: k.wohnort,
      ersetztKindId: k.ersetzt_kind_id,
    }));
  const { freiwerdende } = berechneBelegungsVorschau(vorschauGruppen, vorschauKinder, start, STEUERUNG_MONATE, auswaertigen);
  const wechsel = await ladeWechselDaten(supabase, einrichtungId, {
    gruppen: vorschauGruppen,
    kinder: vorschauKinder,
    startMonat: start,
    monate: STEUERUNG_MONATE,
    heute: toIsoDateString(new Date()),
  });

  // Datenlücken (namentlich)
  const kindName = new Map(kinderListe.map((k) => [k.id, `${k.vorname} ${k.nachname}`]));
  const kinderOhneBuchungszeit = kinderHeute
    .filter((r) => r.buchungszeit_band_id === null)
    .map((r) => ({ id: r.kind_id, name: kindName.get(r.kind_id) ?? "Kind" }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  const langzeit = ermittleLangzeitHinweise(
    (ausfallRes.data ?? []).map((a) => ({ teamId: a.team.id, name: name(a.team), art: a.art, von: a.von, bis: a.bis })),
    stichtag
  ).map((h) => ({ ...h, artLabel: AUSFALLZEIT_ART_LABEL[h.art] }));

  let verguetungFehlt: { id: string; name: string }[] | null = null;
  let foerderbetragFehlt: boolean | null = null;
  let finanzen: Ergebnis | null = null;
  if (optionen.zeigeFinanzen) {
    // Wer fehlt, steht mit Namen in der Handlungsliste und führt zur Vergütung der Person: nur mit dem Recht "gehaelter".
    if (optionen.zeigeGehaelter) {
      const { data: verguetung } = await supabase
        .from("team_verguetung")
        .select("team_id, entgeltgruppe, stufe, monatsgehalt_manuell")
        .eq("einrichtung_id", einrichtungId);
      const mitWert = new Set(
        (verguetung ?? [])
          .filter((v) => v.monatsgehalt_manuell !== null || (v.entgeltgruppe !== null && v.stufe !== null))
          .map((v) => v.team_id)
      );
      verguetungFehlt = team
        .filter((t) => !mitWert.has(t.id))
        .map((t) => ({ id: t.id, name: name(t) }))
        .sort((a, b) => a.name.localeCompare(b.name, "de"));
    }
    if (einrichtung?.bundesland_code === "bw") foerderbetragFehlt = einrichtung.foerderung_monatlich_manuell == null;
    finanzen = await ladeFinanzenHeute(supabase, einrichtungId, stichtag, kinderHeute);
  }

  const handlungen = baueHandlungen({
    stichtag,
    heute: toIsoDateString(new Date()),
    ausblick,
    verursacherIds,
    gruppen: gruppenVerlauf,
    freiwerdende,
    wechsel: { vorschlaege: wechsel.vorschlaege, ohnePlatz: wechsel.ohnePlatz },
    kinderOhneBuchungszeit,
    langzeit,
    verguetungFehlt,
    foerderbetragFehlt,
  });

  const sollplaetze = gruppenListe.reduce((sum, g) => sum + Number(g.sollplatze), 0);
  const belegt = erster.kpis.kinderGesamt;
  return {
    stichtag,
    vollzeitWochenstunden: vollzeit,
    modell: erster.personal.modell,
    belegung: { belegt, sollplaetze, frei: Math.max(0, sollplaetze - belegt) },
    personal: { kennzahl: personalKennzahl(erster.personal), ampel: erster.personal.daten.ampel },
    finanzen,
    handlungen,
    gruppen,
    zuordnung: {
      belastbar: erster.gruppenStatus.belastbar,
      quote: erster.gruppenStatus.zuordnungsquote,
      ohneGruppeStunden: erster.gruppenStatus.ohneGruppeStunden,
    },
    ausblick,
    monate,
  };
}
