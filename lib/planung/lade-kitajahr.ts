import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { buildForecastMonths, ladeFinanzenBasis } from "@/lib/forecast/monthly-forecast";
import { getKinderPresenceAtDate, type PresenceRow } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth } from "@/lib/team/anstellungsschluessel";
import { berechnePersonalAusblick } from "@/lib/ausblick/personal-ausblick";
import { resolveGehaltVollzeitProTeamId, resolveTVoedTabelleAmStichtag } from "@/lib/finanzen/personalkosten";
import { berechneSzenarioErgebnis } from "@/lib/finanzen/ergebnis";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import type { PlanungDaten, PlanungEingabe } from "@/lib/planung/kitajahr";

export type KitajahrPlanungDaten = {
  kitajahrStart: string;
  eingabe: PlanungEingabe;
  gespeichert: PlanungDaten | null;
  gespeichertAm: string | null;
  /** Monatliche Personalkosten (inkl. Nebenkosten) für eine Wochenstunde zusätzlich — nur mit Recht „Finanzübersicht“. */
  kostenJeWochenstunde: number | null;
};

/** Je Kind der höchste Gewichtungsfaktor (Bayern: höchster gilt), dann der Durchschnitt je Gruppe. */
function faktorJeGruppe(rows: PresenceRow[]): Map<string | null, { kinder: number; summe: number }> {
  const hoechster = new Map<string, PresenceRow>();
  for (const r of rows) {
    const alt = hoechster.get(r.kind_id);
    if (!alt || r.weighting_factor_value > alt.weighting_factor_value) hoechster.set(r.kind_id, r);
  }
  const jeGruppe = new Map<string | null, { kinder: number; summe: number }>();
  for (const r of hoechster.values()) {
    const w = jeGruppe.get(r.gruppe_id) ?? { kinder: 0, summe: 0 };
    w.kinder += 1;
    w.summe += r.weighting_factor_value || 1;
    jeGruppe.set(r.gruppe_id, w);
  }
  return jeGruppe;
}

function kinderJeGruppe(rows: PresenceRow[]): Map<string | null, number> {
  const gesehen = new Set<string>();
  const jeGruppe = new Map<string | null, number>();
  for (const r of rows) {
    if (gesehen.has(r.kind_id)) continue;
    gesehen.add(r.kind_id);
    jeGruppe.set(r.gruppe_id, (jeGruppe.get(r.gruppe_id) ?? 0) + 1);
  }
  return jeGruppe;
}

/** Lädt alles für die Kitajahr-Planung: Vorjahr (Ist am gleichen Stichtag), Vorschlag für den Beginn des geplanten Kitajahres
 * (Austritte, Schuleintritte, feste Nachfolger, geplante Wechsel stecken schon in den Daten), Personal nach bekannten Austritten
 * und den gespeicherten Plan. */
export async function ladeKitajahrPlanung(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  kitajahrStart: string,
  zeigeFinanzen: boolean
): Promise<KitajahrPlanungDaten | null> {
  const vorjahrStichtag = toIsoDateString(addMonthsUtc(parseIsoDate(kitajahrStart), -12));
  const [{ data: einrichtung }, { data: gruppen }, monate, vorjahrRows, startRows, { data: gespeichert }] = await Promise.all([
    supabase.from("einrichtungen").select("bundesland_code, vollzeit_wochenstunden").eq("id", einrichtungId).single(),
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .order("sort_order"),
    buildForecastMonths(supabase, einrichtungId, kitajahrStart, 1),
    getKinderPresenceAtDate(supabase, einrichtungId, vorjahrStichtag),
    getKinderPresenceAtDate(supabase, einrichtungId, kitajahrStart),
    supabase.from("kitajahr_planung").select("daten, updated_at").eq("einrichtung_id", einrichtungId).eq("kitajahr_start", kitajahrStart).maybeSingle(),
  ]);
  if (!einrichtung || !gruppen || monate.length === 0) return null;

  const vollzeit = Number(einrichtung.vollzeit_wochenstunden ?? 39);
  const monat = monate[0];
  const ausblick = berechnePersonalAusblick([monat], vollzeit, []).monate[0];
  const vorjahr = kinderJeGruppe(vorjahrRows);
  const faktoren = faktorJeGruppe(startRows);
  const belegtVorschlag = new Map(monat.gruppenStatus.gruppen.map((g) => [g.gruppeId, g.belegt]));

  let stundenJeGewichtetemKind: number | null = null;
  if (monat.personal.modell === "bayern") {
    const d = monat.personal.daten;
    stundenJeGewichtetemKind = d.gewichteteKinderzahl > 0 ? ausblick.sollStunden / d.gewichteteKinderzahl : vollzeit / 11;
  }

  let kostenJeWochenstunde: number | null = null;
  if (zeigeFinanzen) {
    const basis = await ladeFinanzenBasis(supabase, einrichtungId, einrichtung.bundesland_code, vollzeit, new Map());
    const teamRows = await getTeamPresenceForMonth(supabase, einrichtungId, kitajahrStart);
    const gehaelter = resolveGehaltVollzeitProTeamId(
      teamRows.map((t) => t.team_id),
      basis.teamVerguetungByTeamId,
      resolveTVoedTabelleAmStichtag(basis.tvoedVersionenByGroup, kitajahrStart),
      vollzeit
    );
    let summe = 0;
    let stunden = 0;
    for (const t of teamRows) {
      const g = gehaelter.get(t.team_id) ?? 0;
      const std = t.wochenstunden ?? 0;
      if (g > 0 && std > 0) {
        summe += g * std;
        stunden += std;
      }
    }
    if (stunden > 0) {
      const durchschnitt = summe / stunden;
      kostenJeWochenstunde = berechneSzenarioErgebnis(0, [{ wochenstunden: 1, gehaltVollzeit: durchschnitt }], vollzeit, basis.lohnnebenkostenProzent, basis.jahressonderzahlungProzent).personalkostenSimuliert;
    }
  }

  const gespeicherteDaten = gespeichert?.daten as { kinder?: Record<string, number>; einstellenGeplant?: number } | null | undefined;
  return {
    kitajahrStart,
    eingabe: {
      modell: monat.personal.modell,
      vollzeitWochenstunden: vollzeit,
      gruppen: gruppen.map((g) => {
        const f = faktoren.get(g.id);
        return {
          id: g.id,
          name: g.name,
          gruppenart: g.gruppenart,
          sollplaetze: Number(g.sollplatze),
          vorjahrKinder: vorjahr.get(g.id) ?? 0,
          vorschlagKinder: belegtVorschlag.get(g.id) ?? 0,
          durchschnittsfaktor: f && f.kinder > 0 ? f.summe / f.kinder : 1,
        };
      }),
      personalIst: ausblick.istStunden,
      sollVorschlag: ausblick.sollStunden,
      stundenJeGewichtetemKind,
    },
    gespeichert: gespeicherteDaten ? { kinder: gespeicherteDaten.kinder ?? {}, einstellenGeplant: gespeicherteDaten.einstellenGeplant ?? 0 } : null,
    gespeichertAm: gespeichert?.updated_at ?? null,
    kostenJeWochenstunde,
  };
}

