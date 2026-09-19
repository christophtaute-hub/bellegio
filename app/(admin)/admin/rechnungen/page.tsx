import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/kita-datum";
import { formatEuro } from "@/lib/admin/abrechnung";
import { RechnungStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
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

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trager?: string }>;
}) {
  const { status = "alle", trager = "alle" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("rechnungen")
    .select(
      "id, nummer, status, leistungszeitraum_von, leistungszeitraum_bis, summe_netto, summe_brutto, faellig_am, storno_von, created_at, trager(name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (status !== "alle") query = query.eq("status", status);
  if (trager !== "alle") query = query.eq("trager_id", trager);

  const [{ data: rechnungen }, { data: tragerListe }] = await Promise.all([
    query,
    supabase.from("trager").select("id, name").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Rechnungen</h1>
        <Button nativeButton={false} render={<Link href="/admin/rechnungen/neu" />}>
          <Plus className="size-4" />
          Neue Rechnung
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs text-muted-foreground">Status</label>
          <select id="status" name="status" defaultValue={status} className={SELECT_CLASS}>
            <option value="alle">Alle</option>
            <option value="entwurf">Entwurf</option>
            <option value="versendet">Versendet</option>
            <option value="bezahlt">Bezahlt</option>
            <option value="storniert">Storniert</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trager" className="text-xs text-muted-foreground">Kunde</label>
          <select id="trager" name="trager" defaultValue={trager} className={SELECT_CLASS}>
            <option value="alle">Alle</option>
            {(tragerListe ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" size="sm">Filtern</Button>
      </form>

      {rechnungen && rechnungen.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nummer</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Leistungszeitraum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Fällig</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechnungen.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/rechnungen/${r.id}`} className="underline-offset-2 hover:underline">
                      {r.nummer ?? "Entwurf"}
                    </Link>
                    {r.storno_von ? <span className="ml-2 text-xs text-muted-foreground">Gutschrift</span> : null}
                  </TableCell>
                  <TableCell>{(r.trager as unknown as { name: string } | null)?.name ?? "–"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(r.leistungszeitraum_von)} – {formatDate(r.leistungszeitraum_bis)}
                  </TableCell>
                  <TableCell><RechnungStatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuro(Number(r.summe_netto))}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuro(Number(r.summe_brutto))}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(r.faellig_am)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Rechnungen gefunden.</p>
      )}
    </div>
  );
}
