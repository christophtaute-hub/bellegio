import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import { formatEuro } from "@/lib/admin/abrechnung";
import {
  ladeEinnahmenPositionen,
  summiere,
  gruppiere,
  formatMonat,
} from "@/lib/admin/einnahmen";
import { MetricCard } from "@/components/ui/metric-card";
import { EinnahmenChart } from "@/components/admin/einnahmen-chart";
import { EinnahmenExport, type EinnahmenExportZeile } from "@/components/admin/einnahmen-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export default async function EinnahmenPage({
  searchParams,
}: {
  searchParams: Promise<{
    zeitraum?: string;
    jahr?: string;
    monat?: string;
    trager?: string;
    einrichtung?: string;
    ansicht?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());
  const zeitraum = sp.zeitraum === "gesamt" || sp.zeitraum === "monat" ? sp.zeitraum : "jahr";
  const jahr = Number(sp.jahr) || Number(heute.slice(0, 4));
  const monat = /^\d{4}-\d{2}$/.test(sp.monat ?? "") ? (sp.monat as string) : heute.slice(0, 7);
  const trager = sp.trager ?? "alle";
  const einrichtung = sp.einrichtung ?? "alle";
  const ansicht = sp.ansicht === "monat" ? "monat" : "einrichtung";

  const [alleRows, { data: tragerListe }] = await Promise.all([
    ladeEinnahmenPositionen(supabase),
    supabase.from("trager").select("id, name").order("name"),
  ]);

  const einrichtungOptionen = Array.from(
    new Map(
      alleRows
        .filter((r) => trager === "alle" || r.tragerId === trager)
        .map((r) => [r.einrichtungId ?? "ohne", r.einrichtungName])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const gefiltert = alleRows.filter((r) => {
    if (trager !== "alle" && r.tragerId !== trager) return false;
    if (einrichtung !== "alle" && (r.einrichtungId ?? "ohne") !== einrichtung) return false;
    if (zeitraum === "jahr") return r.monat.startsWith(String(jahr));
    if (zeitraum === "monat") return r.monat === monat;
    return true;
  });

  const summe = summiere(gefiltert);
  const zeilen =
    ansicht === "monat"
      ? gruppiere(gefiltert, (r) => r.monat, (key) => formatMonat(key))
      : gruppiere(gefiltert, (r) => r.einrichtungId ?? "ohne", (_, r) => r.einrichtungName);

  const chartJahr = zeitraum === "monat" ? Number(monat.slice(0, 4)) : jahr;
  const chartRows = alleRows.filter(
    (r) =>
      (trager === "alle" || r.tragerId === trager) &&
      (einrichtung === "alle" || (r.einrichtungId ?? "ohne") === einrichtung)
  );
  const chartDaten =
    zeitraum === "gesamt"
      ? gruppiere(chartRows, (r) => r.monat, (key) => formatMonat(key)).map(({ label, bezahlt, offen, erwartet }) => ({ label, bezahlt, offen, erwartet }))
      : Array.from({ length: 12 }, (_, i) => {
          const m = `${chartJahr}-${String(i + 1).padStart(2, "0")}`;
          return { label: formatMonat(m).split(" ")[0], ...summiere(chartRows.filter((r) => r.monat === m)) };
        });

  const exportZeilen: EinnahmenExportZeile[] = zeilen.map((z) => ({
    Bezeichnung: z.label,
    Bezahlt: z.bezahlt,
    "Offen (versendet)": z.offen,
    "Erwartet (Entwurf)": z.erwartet,
    "Ist gesamt (bezahlt + offen)": z.bezahlt + z.offen,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight text-primary">Einnahmen</h1>
          <p className="text-sm text-muted-foreground">
            Netto, nach Leistungsmonat. Stornierte Rechnungen samt Gutschrift zählen nicht.
          </p>
        </div>
        <EinnahmenExport
          zeilen={exportZeilen}
          dateiname={`bellegio-einnahmen-${zeitraum === "monat" ? monat : zeitraum === "jahr" ? jahr : "gesamt"}`}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="zeitraum" className="text-xs text-muted-foreground">Zeitraum</label>
          <select id="zeitraum" name="zeitraum" defaultValue={zeitraum} className={SELECT_CLASS}>
            <option value="gesamt">Gesamt</option>
            <option value="jahr">Jahr</option>
            <option value="monat">Monat</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="jahr" className="text-xs text-muted-foreground">Jahr</label>
          <Input id="jahr" name="jahr" type="number" min={2020} max={2100} defaultValue={jahr} className="h-8 w-24" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="monat" className="text-xs text-muted-foreground">Monat</label>
          <Input id="monat" name="monat" type="month" defaultValue={monat} className="h-8 w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trager" className="text-xs text-muted-foreground">Träger</label>
          <select id="trager" name="trager" defaultValue={trager} className={SELECT_CLASS}>
            <option value="alle">Alle</option>
            {(tragerListe ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="einrichtung" className="text-xs text-muted-foreground">Einrichtung</label>
          <select id="einrichtung" name="einrichtung" defaultValue={einrichtung} className={SELECT_CLASS}>
            <option value="alle">Alle</option>
            {einrichtungOptionen.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ansicht" className="text-xs text-muted-foreground">Gruppiert nach</label>
          <select id="ansicht" name="ansicht" defaultValue={ansicht} className={SELECT_CLASS}>
            <option value="einrichtung">Einrichtung</option>
            <option value="monat">Monat</option>
          </select>
        </div>
        <Button type="submit" variant="secondary" size="sm">Anzeigen</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Ist gesamt (bezahlt + offen)" value={formatEuro(summe.bezahlt + summe.offen)} />
        <MetricCard label="Bezahlt" value={formatEuro(summe.bezahlt)} />
        <MetricCard label="Offen (versendet)" value={formatEuro(summe.offen)} tone={summe.offen > 0 ? "warn" : "default"} />
        <MetricCard label="Erwartet (Entwürfe)" value={formatEuro(summe.erwartet)} />
      </div>

      <div className="rounded-2xl border bg-secondary/30 p-6">
        <EinnahmenChart daten={chartDaten} />
        {chartDaten.length === 0 ? <p className="text-sm text-muted-foreground">Keine Daten für diese Auswahl.</p> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ansicht === "monat" ? "Monat" : "Einrichtung"}</TableHead>
              <TableHead className="text-right">Bezahlt</TableHead>
              <TableHead className="text-right">Offen</TableHead>
              <TableHead className="text-right">Erwartet</TableHead>
              <TableHead className="text-right">Ist gesamt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.map((z) => (
              <TableRow key={z.key}>
                <TableCell className="font-medium">{z.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(z.bezahlt)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(z.offen)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{formatEuro(z.erwartet)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatEuro(z.bezahlt + z.offen)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-secondary/40 font-semibold">
              <TableCell>Summe</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(summe.bezahlt)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(summe.offen)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(summe.erwartet)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(summe.bezahlt + summe.offen)}</TableCell>
            </TableRow>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Rechnungspositionen für diese Auswahl.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
