import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { ladeKampagnen } from "@/lib/marketing/lade-kampagnen";
import { ART_LABEL, KANAL_LABEL, STATUS_LABEL, STATUS_REIHENFOLGE, summiere, type KampagneArt, type KampagneKanal } from "@/lib/marketing/kampagne";
import { FilterLeiste } from "@/components/marketing/filter-leiste";
import { KampagneDialog } from "@/components/marketing/kampagne-dialog";
import { KampagnenListe } from "@/components/marketing/kampagnen-liste";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";

const euro = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Alle Kampagnen aller Einrichtungen, filterbar nach Status, Kanal, Art und Einrichtung. */
export default async function KampagnenPage({ searchParams }: { searchParams: Promise<{ status?: string; kanal?: string; art?: string; einrichtung?: string }> }) {
  const f = await searchParams;
  const supabase = await createClient();
  const [{ data: einrichtungen }, { data: nutzer }, alle, zugriff] = await Promise.all([
    supabase.rpc("marketing_einrichtungen"),
    supabase.rpc("marketing_nutzer"),
    ladeKampagnen(supabase),
    getMarketingZugriff(),
  ]);
  const kampagnen = alle.filter(
    (k) => (!f.status || k.status === f.status) && (!f.kanal || k.kanal === f.kanal) && (!f.art || k.art === f.art) && (!f.einrichtung || k.einrichtungId === f.einrichtung)
  );
  const summe = summiere(kampagnen);
  const einrichtungName = new Map((einrichtungen ?? []).map((e) => [e.id, e.name]));
  const nutzerName = new Map((nutzer ?? []).map((n) => [n.id, n.full_name ?? "Ohne Namen"]));
  const opt = (einrichtungen ?? []).map((e) => ({ id: e.id, label: e.name }));
  const nutzerOpt = (nutzer ?? []).map((n) => ({ id: n.id, label: n.full_name ?? "Ohne Namen" }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kampagnen</h1>
        {zugriff === "bearbeiten" ? <KampagneDialog einrichtungen={opt} nutzer={nutzerOpt} kind={<Button>Neue Kampagne</Button>} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Kampagnen (gefiltert)" value={String(kampagnen.length)} />
        <MetricCard label="Davon aktiv" value={String(kampagnen.filter((k) => k.status === "aktiv").length)} />
        <MetricCard label="Werbebudget" value={euro(summe.budget)} />
        <MetricCard label="Bisherige Kosten" value={euro(summe.kosten)} />
      </div>

      <FilterLeiste
        felder={[
          { name: "status", label: "Status", optionen: STATUS_REIHENFOLGE.map((s) => ({ wert: s, label: STATUS_LABEL[s] })) },
          { name: "kanal", label: "Kanal", optionen: (Object.keys(KANAL_LABEL) as KampagneKanal[]).map((k) => ({ wert: k, label: KANAL_LABEL[k] })) },
          { name: "art", label: "Art", optionen: (Object.keys(ART_LABEL) as KampagneArt[]).map((a) => ({ wert: a, label: ART_LABEL[a] })) },
          { name: "einrichtung", label: "Einrichtung", optionen: (einrichtungen ?? []).map((e) => ({ wert: e.id, label: e.name })) },
        ]}
      />

      <KampagnenListe
        kampagnen={kampagnen}
        einrichtungName={einrichtungName}
        nutzerName={nutzerName}
        einrichtungen={opt}
        nutzer={nutzerOpt}
        darfBearbeiten={zugriff === "bearbeiten"}
        heute={toIsoDateString(new Date())}
        zeigeEinrichtung
      />
    </div>
  );
}
