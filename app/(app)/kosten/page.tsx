import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { formatEuro } from "@/lib/admin/abrechnung";
import { RechnungStatusBadge } from "@/components/admin/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function KostenPage() {
  const rolle = await getCurrentUserRole();
  if (rolle !== "traeger_admin") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kosten</h1>
        <p className="text-sm text-muted-foreground">
          Diese Übersicht steht nur dem Träger-Administrator zur Verfügung.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const heute = new Date();
  const monatsersterIso = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));

  const [{ data: einrichtungen }, { data: abrechnung }, { data: rechnungen }] = await Promise.all([
    supabase.from("einrichtungen").select("id, name").is("archived_at", null).order("name"),
    supabase.from("trager_abrechnung").select("preis_grundgebuehr_pro_einrichtung, preis_pro_kind").maybeSingle(),
    supabase
      .from("rechnungen")
      .select("id, nummer, status, leistungszeitraum_von, leistungszeitraum_bis, summe_brutto, faellig_am")
      .order("leistungszeitraum_von", { ascending: false }),
  ]);

  const kinderProEinrichtung = await Promise.all(
    (einrichtungen ?? []).map(async (e) => ({
      name: e.name,
      kinder: (await getKinderPresenceAtDate(supabase, e.id, monatsersterIso)).length,
    }))
  );
  const grund = abrechnung?.preis_grundgebuehr_pro_einrichtung ?? null;
  const proKind = abrechnung?.preis_pro_kind ?? null;
  const hatPreise = grund !== null || proKind !== null;
  const kinderGesamt = kinderProEinrichtung.reduce((s, e) => s + e.kinder, 0);
  const vorschauNetto =
    (grund ?? 0) * kinderProEinrichtung.length + (proKind ?? 0) * kinderGesamt;
  const monatsName = heute.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kosten</h1>
        <p className="text-sm text-muted-foreground">
          Was Bellegio in {monatsName} voraussichtlich kostet, und deine bisherigen Rechnungen.
        </p>
      </div>

      {hatPreise ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label={`Voraussichtlich ${monatsName} (netto)`} value={formatEuro(vorschauNetto)} />
          <MetricCard label="Einrichtungen" value={String(kinderProEinrichtung.length)} />
          <MetricCard label="Aktive Kinder (1. des Monats)" value={String(kinderGesamt)} />
        </div>
      ) : (
        <p className="rounded-xl border bg-secondary/30 p-4 text-sm text-muted-foreground">
          Für dein Konto sind noch keine Preise hinterlegt — eine Kostenvorschau ist erst möglich, wenn die Preise
          vereinbart sind.
        </p>
      )}
      {hatPreise ? (
        <p className="text-xs text-muted-foreground">
          Unverbindliche Vorschau aus Grundgebühr und Kinderzahl am Monatsersten; verbindlich ist ausschließlich die
          Rechnung.
        </p>
      ) : null}

      <h2 className="font-heading text-lg text-primary">Rechnungen</h2>
      {rechnungen && rechnungen.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nummer</TableHead>
                <TableHead>Leistungszeitraum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Fällig</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechnungen.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/kosten/${r.id}`} className="underline-offset-2 hover:underline">
                      {r.nummer}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(r.leistungszeitraum_von)} – {formatDate(r.leistungszeitraum_bis)}
                  </TableCell>
                  <TableCell><RechnungStatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuro(Number(r.summe_brutto))}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(r.faellig_am)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Rechnungen.</p>
      )}
    </div>
  );
}
