import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { berechnePersonalAusblick, type AusblickAustritt } from "@/lib/ausblick/personal-ausblick";
import { berechneBelegungAmpel, type BelegungAmpel } from "@/lib/steuerung/belegung-ampel";
import { berechnePersonalAmpel, type PersonalAmpel } from "@/lib/steuerung/personal-ampel";

export type KitaAmpel = {
  belegung: BelegungAmpel;
  personal: PersonalAmpel;
  /** Förderung (+ Elternbeiträge) minus Kosten im Monat des Stichtags — nur mit Finanz-Recht. */
  ergebnisMonat: number | null;
  /** Letzte Maßnahme je Bereich für die Anzeige „Zuletzt: …“. */
  letzteMassnahme: { belegung: string | null; personal: string | null };
};

const MONATE_VORAUS = 12;

function plusMonate(monatsErster: string, n: number): string {
  const jahr = Number(monatsErster.slice(0, 4));
  const monat = Number(monatsErster.slice(5, 7)) - 1 + n;
  return new Date(Date.UTC(jahr, monat, 1)).toISOString().slice(0, 10);
}

/** Welche Stichtage rechnen? Jeder Monat wären je Einrichtung zwei Datenbankabfragen — für die Ampel reichen der Stichtag,
 * Quartalsschritte und genau die Monate, in denen sich etwas ändert (Austritt/Eintritt im Team, Kindergartenjahr-Wechsel im
 * September). Höchstens 10 Stichtage. */
export function stuetzStichtage(stichtag: string, ereignisDaten: string[]): string[] {
  const start = `${stichtag.slice(0, 7)}-01`;
  const ende = plusMonate(start, MONATE_VORAUS);
  const kandidaten = new Set<string>([plusMonate(start, 1), plusMonate(start, 3), plusMonate(start, 6), plusMonate(start, 9), ende]);
  for (let i = 1; i <= MONATE_VORAUS; i++) {
    const m = plusMonate(start, i);
    if (m.slice(5, 7) === "09") kandidaten.add(m);
  }
  for (const datum of ereignisDaten) {
    // Die Wirkung beginnt im Monat nach dem letzten Tag (Austritt) bzw. im Eintrittsmonat selbst
    const wirkung = plusMonate(`${datum.slice(0, 7)}-01`, datum.slice(8, 10) === "01" ? 0 : 1);
    if (wirkung > start && wirkung <= ende) kandidaten.add(wirkung);
  }
  const sortiert = [...kandidaten].sort();
  // Zu viele Ereignisse: gleichmäßig ausdünnen, das Ende bleibt
  const gekappt = sortiert.length > 9 ? sortiert.filter((_, i) => i % Math.ceil(sortiert.length / 9) === 0 || i === sortiert.length - 1) : sortiert;
  return [stichtag, ...gekappt];
}

/** Die beiden Ampeln einer Einrichtung für „Meine Einrichtungen“ und das Dashboard: Belegung über die Belegungs-Vorschau,
 * Personal über den Personal-Ausblick (je Stützmonat Ist gegen Soll). Beides ab dem Stichtag, 12 Monate voraus. */
export async function ladeKitaAmpel(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  stichtag: string,
  optionen: { zeigeFinanzen: boolean }
): Promise<KitaAmpel> {
  const [gruppenRes, kinderRes, teamRes, einrichtungRes, massnahmenRes] = await Promise.all([
    supabase.from("gruppen").select("id, name, gruppenart, sollplatze").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase
      .from("kinder")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort, ersetzt_kind_id")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .limit(3000),
    supabase.from("team").select("vorname, nachname, austritt, eintritt, wochenstunden").eq("einrichtung_id", einrichtungId).eq("status", "aktiv").is("archived_at", null),
    supabase.from("einrichtungen").select("vollzeit_wochenstunden").eq("id", einrichtungId).single(),
    supabase.from("massnahmen").select("bereich, titel, created_at").eq("einrichtung_id", einrichtungId).order("created_at", { ascending: false }).limit(20),
  ]);

  const team = teamRes.data ?? [];
  const ereignisse = team.flatMap((t) => [t.austritt, t.eintritt].filter((d): d is string => d !== null));
  const monate = await buildForecastMonths(supabase, einrichtungId, stichtag, MONATE_VORAUS + 1, optionen.zeigeFinanzen, true, stuetzStichtage(stichtag, ereignisse));

  const start = `${stichtag.slice(0, 7)}-01`;
  const austritte: AusblickAustritt[] = team
    .filter((t) => t.austritt !== null && (t.austritt as string) >= start)
    .map((t) => ({ name: [t.vorname, t.nachname].filter(Boolean).join(" "), austritt: t.austritt as string, wochenstunden: Number(t.wochenstunden ?? 0) }));
  const ausblick = berechnePersonalAusblick(monate, Number(einrichtungRes.data?.vollzeit_wochenstunden ?? 39), austritte);

  const gruppen = (gruppenRes.data ?? []).map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) }));
  const kinder = (kinderRes.data ?? []).map((k) => ({
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
  const letzte = (bereich: string) => (massnahmenRes.data ?? []).find((m) => m.bereich === bereich)?.titel ?? null;

  return {
    belegung: berechneBelegungAmpel(gruppen, kinder, stichtag),
    personal: berechnePersonalAmpel(ausblick),
    ergebnisMonat: monate[0]?.finanzen?.ergebnisMonat ?? null,
    letzteMassnahme: { belegung: letzte("belegung"), personal: letzte("personal") },
  };
}
