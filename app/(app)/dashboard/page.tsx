import { Suspense } from "react";
import { Users, Scale, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { computeVorname } from "@/lib/server/current-user-name";
import { addMonthsUtc, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import {
  getKinderPresenceAtDate,
  buildCompositionMatrix,
  buildKpis,
  buildBelegungKennzahlen,
  buildGruppenartAufteilung,
} from "@/lib/dashboard/presence";
import { getPersonalplanungFuerEinrichtung } from "@/lib/team/personalplanung";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { MetricCard } from "@/components/ui/metric-card";
import { StatTile } from "@/components/ui/stat-tile";
import { CompositionChart } from "@/components/dashboard/composition-chart";
import { CompositionTable } from "@/components/dashboard/composition-table";
import { BuchungszeitVerteilung } from "@/components/dashboard/buchungszeit-verteilung";
import { PersonalAusblick, PersonalAusblickSkeleton } from "@/components/dashboard/personal-ausblick";
import { ErsteSchritte } from "@/components/dashboard/erste-schritte";
import { PersonalHinweise } from "@/components/dashboard/personal-hinweise";
import { Handlungsbedarf } from "@/components/dashboard/handlungsbedarf";

// Zeigt beim Laden direkt die nächsten 3 Monate voraus (nicht rückwirkend) —
// der Stichtag-Picker bleibt für weiter entfernte Zeitpunkte.
const TREND_MONTHS = 4;

function formatGewichtet(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function personalKennzahl(
  ergebnis: Awaited<ReturnType<typeof getPersonalplanungFuerEinrichtung>>
): { label: string; value: string; warnt: boolean; trendWert: number } {
  if (ergebnis.modell === "bayern") {
    const { anstellungsschluessel, mindestschluesselOk } = ergebnis.daten;
    return {
      label: "Anstellungsschlüssel",
      value: anstellungsschluessel !== null ? `1 : ${formatGewichtet(anstellungsschluessel)}` : "–",
      warnt: !mindestschluesselOk,
      trendWert: anstellungsschluessel ?? 0,
    };
  }
  if (ergebnis.modell === "bw") {
    const { istVzaeGesamt, sollVzaeGesamt } = ergebnis.daten;
    return {
      label: "Ist-VZÄ / Soll-VZÄ",
      value: `${formatGewichtet(istVzaeGesamt)} / ${formatGewichtet(sollVzaeGesamt)}`,
      warnt: istVzaeGesamt < sollVzaeGesamt,
      trendWert: istVzaeGesamt,
    };
  }
  const { istFk, sollFachkraftStundenGesamt } = ergebnis.daten;
  return {
    label: "Ist-FK / Soll-FK Std.",
    value: `${formatGewichtet(istFk)} / ${formatGewichtet(sollFachkraftStundenGesamt)}`,
    warnt: istFk < sollFachkraftStundenGesamt,
    trendWert: istFk,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stichtag?: string }>;
}) {
  const { stichtag: stichtagParam } = await searchParams;
  const stichtag = stichtagParam ?? toIsoDateString(new Date());
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("user_profiles").select("full_name, email").eq("id", user.id).single()
    : { data: null };
  const vorname = computeVorname(profile?.full_name, profile?.email, user?.email);

  const [rows, personalErgebnis, { data: gruppen }] = einrichtungId
    ? await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
        getPersonalplanungFuerEinrichtung(supabase, einrichtungId, stichtag),
        supabase
          .from("gruppen")
          .select("id, gruppenart, sollplatze")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null),
      ])
    : [[], null, { data: null }];
  const matrix = buildCompositionMatrix(rows);
  const kpis = buildKpis(rows);
  const personal = personalErgebnis ? personalKennzahl(personalErgebnis) : null;
  const modell = personalErgebnis?.modell ?? "bayern";
  const kinderMitBuchungszeit = kpis.kinderGesamt - kpis.ohneBuchungszeit;
  const sollplaetzeSumme = (gruppen ?? []).reduce((sum, g) => sum + Number(g.sollplatze), 0);
  const freiePlaetze = Math.max(0, sollplaetzeSumme - kpis.kinderGesamt);
  const belegung = buildBelegungKennzahlen(rows, sollplaetzeSumme);
  const gruppenartAufteilung = buildGruppenartAufteilung(rows, gruppen ?? []);

  const trendMonths = Array.from({ length: TREND_MONTHS }, (_, i) =>
    toIsoDateString(addMonthsUtc(parseIsoDate(stichtag), i))
  );
  const trendData = einrichtungId
    ? await Promise.all(
        trendMonths.map(async (month) => {
          const [monthRows, monthPersonal] = await Promise.all([
            getKinderPresenceAtDate(supabase, einrichtungId, month),
            getPersonalplanungFuerEinrichtung(supabase, einrichtungId, month),
          ]);
          return {
            kpis: buildKpis(monthRows),
            personal: personalKennzahl(monthPersonal),
          };
        })
      )
    : [];
  const trendKinderGesamt = trendData.map((t) => t.kpis.kinderGesamt);
  const trendUngewichteteSumme = trendData.map((t) => t.kpis.ungewichteteSumme);
  const trendGewichteteSumme = trendData.map((t) => t.kpis.gewichteteSumme);
  const trendMitBuchungszeit = trendData.map(
    (t) => t.kpis.kinderGesamt - t.kpis.ohneBuchungszeit
  );
  const trendPersonal = trendData.map((t) => t.personal.trendWert);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          {vorname ? `Aloha, ${vorname}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Eure Belegung und Personalsituation auf einen Blick.
        </p>
      </div>

      {einrichtungId ? (
        <Suspense fallback={null}>
          <ErsteSchritte einrichtungId={einrichtungId} />
        </Suspense>
      ) : null}

      {einrichtungId ? <PersonalHinweise einrichtungId={einrichtungId} stichtag={stichtag} /> : null}
      {einrichtungId ? <Handlungsbedarf einrichtungId={einrichtungId} /> : null}

      <StichtagPicker basePath="/dashboard" stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Kinder am Stichtag"
          value={String(kpis.kinderGesamt)}
          icon={<Users />}
          trend={trendKinderGesamt}
        />
        {modell === "bayern" ? (
          <>
            <MetricCard
              label="Ungewichtete Buchungsstunden"
              value={formatGewichtet(kpis.ungewichteteSumme)}
              icon={<Wallet />}
              trend={trendUngewichteteSumme}
            />
            <MetricCard
              label="Gewichtete Buchungsstunden"
              value={formatGewichtet(kpis.gewichteteSumme)}
              icon={<Wallet />}
              trend={trendGewichteteSumme}
            />
          </>
        ) : (
          <MetricCard
            label="Kinder mit Buchungszeit"
            value={String(kinderMitBuchungszeit)}
            icon={<Wallet />}
            trend={trendMitBuchungszeit}
          />
        )}
        {personal ? (
          <MetricCard
            label={personal.label}
            value={personal.value}
            icon={<Scale />}
            tone={personal.warnt ? "warn" : "default"}
            trend={trendPersonal}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <StatTile label="Sollplätze" value={String(sollplaetzeSumme)} />
        <StatTile label="Ist-Plätze" value={String(belegung.belegteMitI)} />
        <StatTile
          label="Freie Plätze"
          value={String(freiePlaetze)}
          tone={freiePlaetze === 0 ? "warn" : "default"}
        />
        {gruppenartAufteilung.map((z) => (
          <StatTile
            key={z.gruppenart}
            label={GRUPPENART_LABEL[z.gruppenart] ?? z.gruppenart}
            value={`${z.belegt} / ${z.sollplaetze}`}
            tone={z.belegt > z.sollplaetze ? "warn" : "default"}
          />
        ))}
      </div>

      {einrichtungId ? (
        <Suspense fallback={<PersonalAusblickSkeleton />}>
          <PersonalAusblick einrichtungId={einrichtungId} />
        </Suspense>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg text-primary">
            {modell === "bayern"
              ? "Zusammensetzung nach Buchungszeit und Gewichtungsfaktor"
              : "Verteilung nach Buchungszeit"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {modell === "bayern"
              ? "Wer wie lange gebucht hat, auf einen Blick — die genauen Zahlen stehen in der Tabelle darunter."
              : "Wer wie lange gebucht hat, auf einen Blick — Gewichtungsfaktoren gibt es in diesem Bundesland nicht (siehe Dokumentation)."}
          </p>
        </div>
        {modell === "bayern" ? (
          <>
            <CompositionChart matrix={matrix} />
            <CompositionTable matrix={matrix} />
          </>
        ) : (
          <BuchungszeitVerteilung matrix={matrix} />
        )}
      </div>
    </div>
  );
}
