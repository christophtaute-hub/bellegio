import Link from "next/link";
import { Banknote, Clock, FilePen, Building2, Users, Baby } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import { formatEuro, type OperatorKennzahl } from "@/lib/admin/abrechnung";
import { ladeEinnahmenPositionen, summiere, formatMonat } from "@/lib/admin/einnahmen";
import { MetricCard } from "@/components/ui/metric-card";
import { EinnahmenChart } from "@/components/admin/einnahmen-chart";

export default async function AdminUebersichtPage() {
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());
  const jahr = Number(heute.slice(0, 4));

  const [rows, { data: kennzahlen }, { data: einstellungen }] = await Promise.all([
    ladeEinnahmenPositionen(supabase),
    supabase.rpc("operator_kennzahlen", { p_stichtag: heute }),
    supabase.from("betreiber_einstellungen").select("firmenname, anschrift").eq("id", true).single(),
  ]);

  const jahresRows = rows.filter((r) => r.monat.startsWith(String(jahr)));
  const summe = summiere(jahresRows);
  const chartDaten = Array.from({ length: 12 }, (_, i) => {
    const monat = `${jahr}-${String(i + 1).padStart(2, "0")}`;
    const s = summiere(jahresRows.filter((r) => r.monat === monat));
    return { label: formatMonat(monat).split(" ")[0], ...s };
  });

  const kunden = (kennzahlen ?? []) as OperatorKennzahl[];
  const traegerAnzahl = new Set(kunden.map((k) => k.trager_id)).size;
  const einrichtungenAnzahl = kunden.filter((k) => k.einrichtung_id).length;
  const kinderAnzahl = kunden.reduce((s, k) => s + (k.aktive_kinder ?? 0), 0);
  const betreiberdatenFehlen = !einstellungen?.firmenname || !einstellungen?.anschrift;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Übersicht</h1>
        <p className="text-sm text-muted-foreground">
          Einnahmen {jahr} (netto, nach Leistungsmonat) und Bestand deiner Kunden.
        </p>
      </div>

      {betreiberdatenFehlen ? (
        <div className="rounded-xl border border-accent bg-accent/10 p-4 text-sm">
          Bevor du die erste Rechnung freigeben kannst, fehlen noch deine{" "}
          <Link href="/admin/einstellungen" className="text-primary underline underline-offset-2">
            Betreiberdaten
          </Link>{" "}
          (Firmenname, Anschrift, Bankverbindung).
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={`Bezahlt ${jahr}`} value={formatEuro(summe.bezahlt)} icon={<Banknote />} />
        <MetricCard label="Offen (versendet)" value={formatEuro(summe.offen)} icon={<Clock />} tone={summe.offen > 0 ? "warn" : "default"} />
        <MetricCard label="Erwartet (Entwürfe)" value={formatEuro(summe.erwartet)} icon={<FilePen />} />
        <MetricCard label="Ist gesamt" value={formatEuro(summe.bezahlt + summe.offen)} icon={<Banknote />} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Einnahmen je Monat {jahr}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Rechnungen. Lege unter{" "}
            <Link href="/admin/rechnungen/neu" className="text-primary underline underline-offset-2">
              Rechnungen
            </Link>{" "}
            die erste an.
          </p>
        ) : (
          <EinnahmenChart daten={chartDaten} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Kunden (Träger)" value={String(traegerAnzahl)} icon={<Users />} />
        <MetricCard label="Einrichtungen" value={String(einrichtungenAnzahl)} icon={<Building2 />} />
        <MetricCard label="Aktive Kinder heute" value={String(kinderAnzahl)} icon={<Baby />} />
      </div>
    </div>
  );
}
