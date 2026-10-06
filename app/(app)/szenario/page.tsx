import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KitajahrPlanung } from "@/components/szenario/kitajahr-planung";
import { ladeKitajahrPlanung } from "@/lib/planung/lade-kitajahr";
import { kitajahrBeginnIso, kitajahrLabel, kitajahrStartJahr } from "@/lib/kita-datum";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { canUseSzenarioRechner, canViewFinanzen, canViewGehaelter, getZugriff } from "@/lib/server/current-user-role";
import { getKinderPresenceAtDate, type PresenceRow } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth, getStaffingRules, type TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import { getBWPersonalschluesselTabelle } from "@/lib/team/personalschluessel-bw";
import { getNRWPersonalstundenTabelle } from "@/lib/team/personalschluessel-nrw";
import { ladeFinanzenBasis, resolveFinanzenMonat } from "@/lib/forecast/monthly-forecast";
import { resolveTVoedTabelleAmStichtag, resolveGehaltVollzeitProTeamId } from "@/lib/finanzen/personalkosten";
import type { Ergebnis } from "@/lib/finanzen/ergebnis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { SzenarioRechner } from "@/components/szenario/szenario-rechner";
import { SzenarioRechnerBW } from "@/components/szenario/szenario-rechner-bw";
import { SzenarioRechnerNRW } from "@/components/szenario/szenario-rechner-nrw";

type FinanzenFuerSzenario = {
  finanzenHeute: Ergebnis;
  gehaltVollzeitByTeamId: Map<string, number>;
  /** Ohne das Recht "Einzelgehälter": keine Gehaltsfelder je Zeile, der Rechner rechnet mit dem Durchschnitt. */
  gehaltFelder: boolean;
  standardGehalt: number;
  lohnnebenkostenProzent: number;
  jahressonderzahlungProzent: number;
};

/** Lädt die Finanzen-Basis einmal und leitet daraus sowohl den fixen "heute"-Ergebniswert als auch das
 * Vollzeit-Monatsgehalt je Teammitglied ab (für die editierbaren Pro-Zeile-Gehaltsfelder im Rechner,
 * Milestone 31, Punkt D) — eine Basis für beides statt zweier getrennter Ladevorgänge. */
async function ladeFinanzenFuerSzenario(
  supabase: SupabaseClient<Database>,
  einrichtungId: string,
  bundeslandCode: string,
  vollzeitWochenstunden: number,
  nrwGruppenById: Map<string, { nrwGruppenform: string | null; nrwBuchungszeitStunden: number | null }>,
  today: string,
  kinderRows: PresenceRow[],
  teamRows: TeamPresenceRow[],
  zeigeGehaelter: boolean
): Promise<FinanzenFuerSzenario> {
  const basis = await ladeFinanzenBasis(supabase, einrichtungId, bundeslandCode, vollzeitWochenstunden, nrwGruppenById);
  const tvoedTabelle = resolveTVoedTabelleAmStichtag(basis.tvoedVersionenByGroup, today);
  const gehaltVollzeitByTeamId = resolveGehaltVollzeitProTeamId(
    teamRows.map((t) => t.team_id),
    basis.teamVerguetungByTeamId,
    tvoedTabelle,
    vollzeitWochenstunden
  );
  // Ohne Einzelgehälter-Recht verlässt nur der stundengewichtete Durchschnitt den Server, nie ein Einzelwert.
  let standardGehalt = 0;
  let gehaltByTeamId = gehaltVollzeitByTeamId;
  if (!zeigeGehaelter) {
    let summe = 0;
    let stunden = 0;
    for (const t of teamRows) {
      const gehalt = gehaltVollzeitByTeamId.get(t.team_id) ?? 0;
      const std = t.wochenstunden ?? 0;
      if (gehalt > 0 && std > 0) {
        summe += gehalt * std;
        stunden += std;
      }
    }
    standardGehalt = stunden > 0 ? Math.round(summe / stunden) : 0;
    gehaltByTeamId = new Map(teamRows.map((t) => [t.team_id, standardGehalt]));
  }
  return {
    finanzenHeute: resolveFinanzenMonat(basis, today, kinderRows, teamRows),
    gehaltVollzeitByTeamId: gehaltByTeamId,
    gehaltFelder: zeigeGehaelter,
    standardGehalt,
    lohnnebenkostenProzent: basis.lohnnebenkostenProzent,
    jahressonderzahlungProzent: basis.jahressonderzahlungProzent,
  };
}

async function WasWaereWennInhalt() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const erlaubt = einrichtungId
    ? await canUseSzenarioRechner(supabase, einrichtungId)
    : false;

  if (!erlaubt) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Szenario-Rechner
        </h1>
        <p className="text-sm text-muted-foreground">
          Diese Funktion steht nur der Einrichtungsleitung bzw. dem
          Träger-Admin zur Verfügung.
        </p>
      </div>
    );
  }

  const today = toIsoDateString(new Date());

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("empfohlener_anstellungsschluessel, vollzeit_wochenstunden, bundesland_code")
        .eq("id", einrichtungId)
        .single()
    : { data: null };
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;

  const teamRows = einrichtungId
    ? await getTeamPresenceForMonth(supabase, einrichtungId, today)
    : [];
  const zeigeFinanzen = einrichtungId ? await canViewFinanzen(supabase, einrichtungId) : false;
  const zeigeGehaelter = einrichtungId ? await canViewGehaelter(supabase, einrichtungId) : false;

  let inhalt: React.ReactNode;

  if (bundeslandCode === "bw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      einrichtungId
        ? supabase
            .from("gruppen")
            .select("name, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden, bw_randzeit_stunden")
            .eq("einrichtung_id", einrichtungId)
            .is("archived_at", null)
        : Promise.resolve({ data: null }),
      getBWPersonalschluesselTabelle(supabase),
    ]);
    const initialGruppen = (gruppenRows ?? []).map((g) => ({
      name: g.name,
      betriebsform: g.bw_betriebsform,
      altersmischung: g.bw_altersmischung,
      oeffnungszeitStunden: g.bw_oeffnungszeit_stunden,
      randzeitStunden: g.bw_randzeit_stunden,
    }));
    // BW hat keine Fördererlöse-Formel — die Finanzen-Basis liefert dafür immer nur den manuellen
    // Förderbetrag (oder 0, falls keiner gesetzt ist), kinderRows bleibt deshalb ungenutzt.
    const finanzenBw =
      zeigeFinanzen && einrichtungId
        ? await ladeFinanzenFuerSzenario(supabase, einrichtungId, bundeslandCode, vollzeitWochenstunden, new Map(), today, [], teamRows, zeigeGehaelter)
        : null;
    const initialPersonal = teamRows.map((t) => ({
      wochenstunden: t.wochenstunden ?? 0,
      gehaltVollzeit: finanzenBw?.gehaltVollzeitByTeamId.get(t.team_id) ?? 0,
    }));

    inhalt = (
      <SzenarioRechnerBW
        tabelle={tabelle}
        initialGruppen={initialGruppen}
        initialPersonal={initialPersonal}
        vollzeitWochenstunden={vollzeitWochenstunden}
        finanzenHeute={finanzenBw?.finanzenHeute}
        gehaltFelder={finanzenBw?.gehaltFelder}
        standardGehalt={finanzenBw?.standardGehalt}
        lohnnebenkostenProzent={finanzenBw?.lohnnebenkostenProzent ?? 0}
        jahressonderzahlungProzent={finanzenBw?.jahressonderzahlungProzent ?? 0}
      />
    );
  } else if (bundeslandCode === "nrw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      einrichtungId
        ? supabase
            .from("gruppen")
            .select("id, name, nrw_gruppenform, nrw_buchungszeit_stunden")
            .eq("einrichtung_id", einrichtungId)
            .is("archived_at", null)
        : Promise.resolve({ data: null }),
      getNRWPersonalstundenTabelle(supabase),
    ]);
    const initialGruppen = (gruppenRows ?? []).map((g) => ({
      name: g.name,
      gruppenform: g.nrw_gruppenform,
      buchungszeitStunden: g.nrw_buchungszeit_stunden,
    }));

    let finanzenNrw: FinanzenFuerSzenario | null = null;
    if (zeigeFinanzen && einrichtungId) {
      const nrwGruppenById = new Map(
        (gruppenRows ?? []).map((g) => [
          g.id,
          { nrwGruppenform: g.nrw_gruppenform, nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden },
        ])
      );
      const kinderRows = await getKinderPresenceAtDate(supabase, einrichtungId, today);
      finanzenNrw = await ladeFinanzenFuerSzenario(
        supabase,
        einrichtungId,
        bundeslandCode,
        vollzeitWochenstunden,
        nrwGruppenById,
        today,
        kinderRows,
        teamRows,
        zeigeGehaelter
      );
    }

    const initialPersonal = teamRows
      .filter((t) => t.role_category === "fk" || t.role_category === "ek")
      .map((t) => ({
        roleCategory: t.role_category as "fk" | "ek",
        wochenstunden: t.wochenstunden ?? 0,
        gehaltVollzeit: finanzenNrw?.gehaltVollzeitByTeamId.get(t.team_id) ?? 0,
      }));

    inhalt = (
      <SzenarioRechnerNRW
        tabelle={tabelle}
        initialGruppen={initialGruppen}
        initialPersonal={initialPersonal}
        vollzeitWochenstunden={vollzeitWochenstunden}
        finanzenHeute={finanzenNrw?.finanzenHeute}
        gehaltFelder={finanzenNrw?.gehaltFelder}
        standardGehalt={finanzenNrw?.standardGehalt}
        lohnnebenkostenProzent={finanzenNrw?.lohnnebenkostenProzent ?? 0}
        jahressonderzahlungProzent={finanzenNrw?.jahressonderzahlungProzent ?? 0}
      />
    );
  } else {
    const [{ data: bookingTimeBands }, { data: weightingFactors }, { data: gruppen }] =
      await Promise.all([
        supabase
          .from("booking_time_bands")
          .select("id, label, factor")
          .eq("bundesland_code", bundeslandCode)
          .order("sort_order"),
        supabase
          .from("weighting_factors")
          .select("id, code, label, factor")
          .eq("bundesland_code", bundeslandCode),
        einrichtungId
          ? supabase
              .from("gruppen")
              .select("id, sollplatze")
              .eq("einrichtung_id", einrichtungId)
              .is("archived_at", null)
          : Promise.resolve({ data: null }),
      ]);

    const [kinderRows, staffingRules] = einrichtungId
      ? await Promise.all([
          getKinderPresenceAtDate(supabase, einrichtungId, today),
          getStaffingRules(supabase, bundeslandCode),
        ])
      : [[], await getStaffingRules(supabase, bundeslandCode)];

    const bands = (bookingTimeBands ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      factor: Number(b.factor),
    }));
    const categories = (weightingFactors ?? []).map((w) => ({
      id: w.id,
      code: w.code,
      label: w.label,
      factor: Number(w.factor),
    }));

    const initialMatrix: Record<string, Record<string, number>> = {};
    for (const category of categories) {
      initialMatrix[category.id] = {};
      for (const band of bands) {
        const count = kinderRows.filter(
          (r) =>
            r.weighting_factor_id === category.id &&
            r.buchungszeit_band_id === band.id
        ).length;
        initialMatrix[category.id][band.id] = count;
      }
    }

    const initialSollplaetzeSumme = (gruppen ?? []).reduce(
      (sum, g) => sum + Number(g.sollplatze),
      0
    );
    const empfohlenerSchluesselWert =
      einrichtung?.empfohlener_anstellungsschluessel ?? 10.0;

    const finanzenBayern =
      zeigeFinanzen && einrichtungId
        ? await ladeFinanzenFuerSzenario(supabase, einrichtungId, bundeslandCode, vollzeitWochenstunden, new Map(), today, kinderRows, teamRows, zeigeGehaelter)
        : null;

    const initialPersonal = teamRows.map((t) => ({
      role_category: t.role_category ?? "ek",
      wochenstunden: t.wochenstunden ?? 0,
      gehaltVollzeit: finanzenBayern?.gehaltVollzeitByTeamId.get(t.team_id) ?? 0,
    }));

    inhalt = (
      <SzenarioRechner
        bands={bands}
        categories={categories}
        initialMatrix={initialMatrix}
        initialPersonal={initialPersonal}
        initialSollplaetzeSumme={initialSollplaetzeSumme}
        empfohlenerSchluesselWert={empfohlenerSchluesselWert}
        vollzeitWochenstunden={vollzeitWochenstunden}
        staffingRules={staffingRules}
        finanzenHeute={finanzenBayern?.finanzenHeute}
        gehaltFelder={finanzenBayern?.gehaltFelder}
        standardGehalt={finanzenBayern?.standardGehalt}
        lohnnebenkostenProzent={finanzenBayern?.lohnnebenkostenProzent ?? 0}
        jahressonderzahlungProzent={finanzenBayern?.jahressonderzahlungProzent ?? 0}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Vorbefüllt mit den echten heutigen Zahlen — Änderungen hier werden nirgends gespeichert, rein zum Durchrechnen.
      </p>
      {inhalt}
    </div>
  );
}

/** Reiter „Kitajahr planen“: Vorschlag aus den bekannten Veränderungen, eigene Planzahlen, Personalbedarf. */
async function PlanungInhalt({ jahrParam }: { jahrParam?: string }) {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) return null;
  const supabase = await createClient();
  const [{ data: einrichtung }, zeigeFinanzen, zugriff] = await Promise.all([
    supabase.from("einrichtungen").select("kita_year_start_month").eq("id", einrichtungId).single(),
    canViewFinanzen(supabase, einrichtungId),
    getZugriff(supabase, einrichtungId, "szenario"),
  ]);
  const startMonat = einrichtung?.kita_year_start_month ?? 9;
  const heute = new Date();
  const aktuellesJahr = kitajahrStartJahr(heute, startMonat);
  const gewaehlt = [aktuellesJahr, aktuellesJahr + 1, aktuellesJahr + 2].find((j) => j === Number(jahrParam)) ?? aktuellesJahr + 1;
  const start = kitajahrBeginnIso(gewaehlt, startMonat);

  const daten = await ladeKitajahrPlanung(supabase, einrichtungId, start, zeigeFinanzen);
  if (!daten) return <p className="text-sm text-muted-foreground">Für diese Einrichtung gibt es noch keine Daten für eine Planung.</p>;

  return (
    <KitajahrPlanung
      key={start}
      einrichtungId={einrichtungId}
      kitajahrStart={start}
      kitajahrLabel={kitajahrLabel(gewaehlt, startMonat)}
      auswahl={[aktuellesJahr, aktuellesJahr + 1, aktuellesJahr + 2].map((j) => ({ jahr: j, label: kitajahrLabel(j, startMonat), aktiv: j === gewaehlt }))}
      eingabe={daten.eingabe}
      gespeichert={daten.gespeichert}
      gespeichertAm={daten.gespeichertAm}
      kostenJeWochenstunde={daten.kostenJeWochenstunde}
      darfBearbeiten={zugriff === "bearbeiten"}
    />
  );
}

export default async function SzenarioPage({ searchParams }: { searchParams: Promise<{ reiter?: string; jahr?: string }> }) {
  const { reiter, jahr } = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const erlaubt = einrichtungId ? await canUseSzenarioRechner(supabase, einrichtungId) : false;

  if (!erlaubt) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Planung</h1>
        <p className="text-sm text-muted-foreground">Für diesen Bereich hast du keinen Zugriff auf die aktuelle Einrichtung.</p>
      </div>
    );
  }

  const wasWaereWenn = reiter === "wenn";
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">Planung</h1>
      <nav className="flex gap-1 border-b" aria-label="Planung">
        {[
          { href: "/szenario", label: "Kitajahr planen", aktiv: !wasWaereWenn },
          { href: "/szenario?reiter=wenn", label: "Was wäre wenn", aktiv: wasWaereWenn },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.aktiv ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${t.aktiv ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {wasWaereWenn ? <WasWaereWennInhalt /> : <PlanungInhalt jahrParam={jahr} />}
    </div>
  );
}
