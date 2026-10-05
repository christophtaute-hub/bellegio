import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { berechneElternbeitraege, ladeBeitragszeilen, preiseAmStichtag, type BeitragZeile } from "@/lib/finanzen/elternbeitraege";
import {
  getKinderPresenceAtDate,
  buildKpis,
  buildBelegungKennzahlen,
  buildCompositionMatrix,
  buildKpisByGruppenart,
  type KpiSummary,
  type BelegungKennzahlen,
  type CompositionMatrix,
  type KpisByGruppenart,
  type PresenceRow,
} from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth, type TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import {
  ladePersonalplanungBasis,
  resolvePersonalplanungKontext,
  berechnePersonalplanung,
  type PersonalplanungErgebnis,
} from "@/lib/team/personalplanung";
import {
  getBayernBasiswertVersionen,
  getNRWKindpauschalenVersionen,
  resolveBayernBasiswertAmStichtag,
  resolveNRWKindpauschalenTabelleAmStichtag,
  berechneBayernFoerdererloesGesamt,
  berechneNRWFoerdererloesGesamt,
  type BayernBasiswertVersion,
  type NRWKindpauschaleVersion,
} from "@/lib/finanzen/foerdererloese";
import {
  getTVoedEntgeltVersionen,
  resolveTVoedTabelleAmStichtag,
  berechnePersonalkostenProMitarbeiter,
  berechnePersonalkostenGesamt,
  type TVoedEntgeltVersion,
} from "@/lib/finanzen/personalkosten";
import { berechneErgebnis, type Ergebnis } from "@/lib/finanzen/ergebnis";
import { berechneGruppenStatus, type GruppenStatusErgebnis } from "@/lib/steuerung/gruppen-status";

export type ZeitkategorieMonat =
  | { modell: "bayern"; matrix: CompositionMatrix }
  | {
      modell: "bw";
      gruppen: { name: string; betriebsform: string | null; altersmischung: boolean }[];
    }
  | {
      modell: "nrw";
      gruppen: { name: string; gruppenform: string | null; buchungszeitStunden: number | null }[];
    };

export type ForecastMonth = {
  month: string;
  kpis: KpiSummary;
  /** Ungewichtete/gewichtete Kennzahlen je Gruppenart (Krippe/Kindergarten/…) — bislang
   * nur in der Bayern-Ansicht ausgewertet, da "gewichtet" in BW/NRW kein Konzept ist. */
  kpisByGruppenart: KpisByGruppenart[];
  belegung: BelegungKennzahlen;
  /** Bundesland-abhängig: Bayern (Anstellungsschlüssel), BW (VZÄ-Soll), NRW (Fachkraft-/Ergänzungskraft-Stunden). */
  personal: PersonalplanungErgebnis;
  zeitkategorie: ZeitkategorieMonat;
  /** Belegung und Personal je Gruppe (Gruppen-Ampel, Milestone 33). */
  gruppenStatus: GruppenStatusErgebnis;
  /** Fördererlöse/Personalkosten/Ergebnis — nur gesetzt, wenn buildForecastMonths mit
   * includeFinanzen=true aufgerufen wurde (Bereich "finanzen", Milestone 29c). Bewusst optional statt
   * eines leeren Platzhalters, damit "kein Zugriff" zu "Feld fehlt komplett" statt "Feld zeigt 0 €"
   * führt. */
  finanzen?: Ergebnis;
};

export type FinanzenBasis = {
  bundeslandCode: string;
  foerderungManuell: number | null;
  lohnnebenkostenProzent: number;
  jahressonderzahlungProzent: number;
  vollzeitWochenstunden: number;
  bayernVersionen: BayernBasiswertVersion[];
  nrwKindpauschalenVersionenByGroup: Map<string, NRWKindpauschaleVersion[]>;
  nrwGruppenById: Map<string, { nrwGruppenform: string | null; nrwBuchungszeitStunden: number | null }>;
  tvoedVersionenByGroup: Map<string, TVoedEntgeltVersion[]>;
  teamVerguetungByTeamId: Map<string, { entgeltgruppe: string | null; stufe: number | null; monatsgehaltManuell: number | null }>;
  /** Interne Preisliste (Elternbeiträge) — leer, wenn keine hinterlegt ist. */
  beitraege: BeitragZeile[];
};

async function ladeVerguetungFuerSummen(supabase: SupabaseClient<Database>, einrichtungId: string) {
  let client: SupabaseClient<Database> = supabase;
  try {
    client = createServiceRoleClient();
  } catch {
    // Ohne Service-Key (lokale Entwicklung) bleibt der Nutzer-Client: Träger-Admins sehen dann trotzdem alles.
  }
  return client.from("team_verguetung").select("team_id, entgeltgruppe, stufe, monatsgehalt_manuell").eq("einrichtung_id", einrichtungId);
}

/** Exportiert, damit der Szenario-Rechner (Milestone 30, Phase H) dieselbe Finanzen-Basis für "heute"
 * laden kann, statt die Fördererlöse-/Personalkosten-Verdrahtung ein zweites Mal nachzubauen.
 *
 * Nur aufrufen, nachdem der Aufrufer das Recht "finanzen" (Summen) geprüft hat. Die Einzelvergütungen werden bewusst
 * mit dem Service-Client gelesen: wer nur die Finanzübersicht sehen darf (ohne Recht "gehaelter"), würde sonst durch die
 * RLS von team_verguetung eine Summe von 0 € sehen. Von hier verlässt nur das Aggregat den Server, nie die Einzelwerte. */
export async function ladeFinanzenBasis(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  bundeslandCode: string,
  vollzeitWochenstunden: number,
  nrwGruppenById: Map<string, { nrwGruppenform: string | null; nrwBuchungszeitStunden: number | null }>
): Promise<FinanzenBasis> {
  const [
    { data: einrichtungFinanzen },
    bayernVersionen,
    nrwKindpauschalenVersionenByGroup,
    tvoedVersionenByGroup,
    { data: verguetungRows },
    beitraege,
  ] = await Promise.all([
    supabase.from("einrichtungen").select("foerderung_monatlich_manuell, lohnnebenkosten_prozent, jahressonderzahlung_prozent").eq("id", einrichtungId).single(),
    getBayernBasiswertVersionen(supabase),
    getNRWKindpauschalenVersionen(supabase),
    getTVoedEntgeltVersionen(supabase),
    ladeVerguetungFuerSummen(supabase, einrichtungId),
    ladeBeitragszeilen(supabase, einrichtungId),
  ]);

  const teamVerguetungByTeamId = new Map(
    (verguetungRows ?? []).map((v) => [v.team_id, { entgeltgruppe: v.entgeltgruppe, stufe: v.stufe, monatsgehaltManuell: v.monatsgehalt_manuell }])
  );

  return {
    bundeslandCode,
    foerderungManuell: einrichtungFinanzen?.foerderung_monatlich_manuell ?? null,
    lohnnebenkostenProzent: Number(einrichtungFinanzen?.lohnnebenkosten_prozent ?? 28),
    jahressonderzahlungProzent: Number(einrichtungFinanzen?.jahressonderzahlung_prozent ?? 85),
    vollzeitWochenstunden,
    bayernVersionen,
    nrwKindpauschalenVersionenByGroup,
    nrwGruppenById,
    tvoedVersionenByGroup,
    teamVerguetungByTeamId,
    beitraege,
  };
}

/** Reine Funktion: löst die noch stichtags-freie Finanzen-Basis für einen konkreten Monat auf.
 * Fördererlöse: manueller Überschreib > Bundesland-Formel (Bayern/NRW) > 0 (BW ohne Formel).
 * Personalkosten: aus den bereits für "personal" geladenen teamRows + der geladenen Vergütung.
 * Exportiert, siehe ladeFinanzenBasis. */
export function resolveFinanzenMonat(
  basis: FinanzenBasis,
  stichtag: string,
  kinderRows: PresenceRow[],
  teamRows: TeamPresenceRow[]
): Ergebnis {
  let foerdererloeseMonat: number;
  if (basis.foerderungManuell !== null) {
    foerdererloeseMonat = basis.foerderungManuell;
  } else if (basis.bundeslandCode === "by") {
    const basiswert = resolveBayernBasiswertAmStichtag(basis.bayernVersionen, stichtag);
    // Basiswert und Qualitätsbonus sind Jahresbeträge je Kind (Förderabschläge werden in Monatsraten gezahlt) → ÷ 12.
    foerdererloeseMonat = berechneBayernFoerdererloesGesamt(kinderRows, basiswert) / 12;
  } else if (basis.bundeslandCode === "nrw") {
    const tabelle = resolveNRWKindpauschalenTabelleAmStichtag(basis.nrwKindpauschalenVersionenByGroup, stichtag);
    foerdererloeseMonat = berechneNRWFoerdererloesGesamt(
      kinderRows.map((r) => r.gruppe_id),
      basis.nrwGruppenById,
      tabelle
    );
  } else {
    foerdererloeseMonat = 0;
  }

  const tvoedTabelle = resolveTVoedTabelleAmStichtag(basis.tvoedVersionenByGroup, stichtag);
  const personalkostenErgebnisse = teamRows.map((t) =>
    berechnePersonalkostenProMitarbeiter(
      {
        teamId: t.team_id,
        wochenstunden: t.wochenstunden,
        entgeltgruppe: basis.teamVerguetungByTeamId.get(t.team_id)?.entgeltgruppe ?? null,
        stufe: basis.teamVerguetungByTeamId.get(t.team_id)?.stufe ?? null,
        monatsgehaltManuell: basis.teamVerguetungByTeamId.get(t.team_id)?.monatsgehaltManuell ?? null,
      },
      tvoedTabelle,
      basis.vollzeitWochenstunden
    )
  );
  const personalkosten = berechnePersonalkostenGesamt(personalkostenErgebnisse, basis.lohnnebenkostenProzent, basis.jahressonderzahlungProzent);
  const preise = preiseAmStichtag(basis.beitraege, stichtag);
  const elternbeitraege = preise.size > 0 ? berechneElternbeitraege(kinderRows, preise).summe : null;
  return berechneErgebnis(foerdererloeseMonat, personalkosten, elternbeitraege);
}

function monthStart(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return toIsoDateString(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

export async function buildForecastMonths(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  startMonth: string,
  monthCount: number,
  includeFinanzen = false,
  /** true: der erste Eintrag nutzt `startMonth` als exakten Stichtag (Tag genau) statt des Monatsersten —
   * für das Dashboard, dessen Stichtag „heute“ sein soll. Alle weiteren Einträge sind Monatserste. */
  ersterStichtagExakt = false
): Promise<ForecastMonth[]> {
  const [{ data: gruppen }, { data: einrichtung }, personalBasis] = await Promise.all([
    supabase
      .from("gruppen")
      .select(
        "id, name, gruppenart, sollplatze, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden, bw_randzeit_stunden, nrw_gruppenform, nrw_buchungszeit_stunden"
      )
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null),
    supabase
      .from("einrichtungen")
      .select("bundesland_code")
      .eq("id", einrichtungId)
      .single(),
    ladePersonalplanungBasis(supabase, einrichtungId),
  ]);

  const gruppenSollplatzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  const nrwGruppenById = new Map(
    (gruppen ?? []).map((g) => [g.id, { nrwGruppenform: g.nrw_gruppenform, nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden }])
  );
  const finanzenBasis = includeFinanzen
    ? await ladeFinanzenBasis(supabase, einrichtungId, bundeslandCode, personalBasis.vollzeitWochenstunden, nrwGruppenById)
    : null;

  // BW/NRW: die Gruppen-Konfiguration (Betriebsform/Gruppenform) wird nicht
  // historisiert — für jeden Monat im Zeitraum wird daher die aktuelle
  // Konfiguration angezeigt, auch für vergangene Monate.
  const [{ data: bwGruppen }, { data: nrwGruppen }] = await Promise.all([
    bundeslandCode === "bw"
      ? supabase
          .from("gruppen")
          .select("name, bw_betriebsform, bw_altersmischung")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
      : Promise.resolve({ data: null }),
    bundeslandCode === "nrw"
      ? supabase
          .from("gruppen")
          .select("name, nrw_gruppenform, nrw_buchungszeit_stunden")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
      : Promise.resolve({ data: null }),
  ]);

  const start = monthStart(startMonth);
  const months = Array.from({ length: monthCount }, (_, i) =>
    i === 0 && ersterStichtagExakt ? startMonth : toIsoDateString(addMonthsUtc(parseIsoDate(start), i))
  );

  return Promise.all(
    months.map(async (month) => {
      const [kinderRows, teamRows] = await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, month),
        getTeamPresenceForMonth(supabase, einrichtungId, month),
      ]);

      const kpis = buildKpis(kinderRows);
      const kpisByGruppenart = buildKpisByGruppenart(kinderRows, gruppen ?? []);
      const belegung = buildBelegungKennzahlen(kinderRows, gruppenSollplatzeSumme);
      const personalKontext = resolvePersonalplanungKontext(personalBasis, month);
      const personal = berechnePersonalplanung(personalKontext, teamRows, {
        gewichteteKinderzahl: kpis.gewichteteKinderzahl,
        gewichteteKinderzahlFachkraftquote: kpis.gewichteteKinderzahlFachkraftquote,
      });

      const zeitkategorie: ZeitkategorieMonat =
        bundeslandCode === "bw"
          ? {
              modell: "bw",
              gruppen: (bwGruppen ?? []).map((g) => ({
                name: g.name,
                betriebsform: g.bw_betriebsform,
                altersmischung: g.bw_altersmischung,
              })),
            }
          : bundeslandCode === "nrw"
            ? {
                modell: "nrw",
                gruppen: (nrwGruppen ?? []).map((g) => ({
                  name: g.name,
                  gruppenform: g.nrw_gruppenform,
                  buchungszeitStunden: g.nrw_buchungszeit_stunden,
                })),
              }
            : { modell: "bayern", matrix: buildCompositionMatrix(kinderRows) };

      const finanzen = finanzenBasis ? resolveFinanzenMonat(finanzenBasis, month, kinderRows, teamRows) : undefined;
      const gruppenStatus = berechneGruppenStatus(gruppen ?? [], personalKontext, kinderRows, teamRows);

      return { month, kpis, kpisByGruppenart, belegung, personal, zeitkategorie, gruppenStatus, finanzen };
    })
  );
}
