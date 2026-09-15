import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { KIND_STATUS_LABEL, GESCHLECHT_LABEL } from "@/lib/constants";
import { austrittWarnung, calculateAgeDecimal, formatDate } from "@/lib/kita-datum";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export default async function KinderPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; gruppe?: string }>;
}) {
  const { q = "", status = "alle", gruppe = "alle" } = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [{ data: gruppen }, { data: einrichtung }, canEditBelegung] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    einrichtungId
      ? supabase
          .from("einrichtungen")
          .select("kita_year_start_month")
          .eq("id", einrichtungId)
          .single()
      : Promise.resolve({ data: null }),
    einrichtungId ? canWriteBelegung(supabase, einrichtungId) : false,
  ]);
  const kitaYearStartMonth = einrichtung?.kita_year_start_month ?? 9;

  let query = supabase
    .from("kinder")
    .select(
      "id, vorname, nachname, geburtsdatum, geschlecht, eintritt, austritt, status, notizen, gruppe_id, gruppen(name), booking_time_bands(label), kind_weighting_factors(weighting_factors(label))"
    )
    .eq("einrichtung_id", einrichtungId ?? "")
    .is("archived_at", null)
    .order("geburtsdatum", { ascending: true });

  if (status !== "alle") {
    query = query.eq("status", status);
  }
  if (gruppe !== "alle") {
    query = query.eq("gruppe_id", gruppe);
  }
  if (q.trim()) {
    query = query.or(`vorname.ilike.%${q.trim()}%,nachname.ilike.%${q.trim()}%`);
  }

  const { data: kinder } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kinder</h1>
        {canEditBelegung ? (
          <Button nativeButton={false} render={<Link href="/kinder/neu" />}>
            Kind anlegen
          </Button>
        ) : null}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted-foreground">
            Suche
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name…"
            className="h-8 w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className={SELECT_CLASS}
          >
            <option value="alle">Alle</option>
            <option value="aktiv">Aktiv</option>
            <option value="nachruecker">Nachrücker</option>
            <option value="geplant">Geplant</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="gruppe" className="text-xs text-muted-foreground">
            Gruppe
          </label>
          <select
            id="gruppe"
            name="gruppe"
            defaultValue={gruppe}
            className={SELECT_CLASS}
          >
            <option value="alle">Alle</option>
            {(gruppen ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Filtern
        </Button>
      </form>

      {kinder && kinder.length > 0 ? (
        <TooltipProvider>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gruppe</TableHead>
                  <TableHead>Geburtstag</TableHead>
                  <TableHead>Eintritt</TableHead>
                  <TableHead>Austritt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kinder.map((kind) => {
                  const warnung = austrittWarnung(
                    kind.austritt,
                    kitaYearStartMonth
                  );
                  const gewichtungsfaktoren = kind.kind_weighting_factors
                    .map((kwf) => kwf.weighting_factors?.label)
                    .filter((label): label is string => Boolean(label));
                  return (
                    <TableRow
                      key={kind.id}
                      className={cn(
                        "group/row",
                        warnung === "rot" &&
                          "bg-destructive text-destructive-foreground"
                      )}
                    >
                      <TableCell className="font-medium">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Link
                                href={`/kinder/${kind.id}`}
                                className="rounded underline-offset-2 group-hover/row:underline"
                              />
                            }
                          >
                            {kind.vorname} {kind.nachname}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <div className="flex flex-col gap-0.5">
                              <span>
                                {GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht}
                                {" · "}
                                {calculateAgeDecimal(kind.geburtsdatum)} Jahre
                              </span>
                              <span>
                                Buchungszeit: {kind.booking_time_bands?.label ?? "–"}
                              </span>
                              <span>
                                Gewichtung:{" "}
                                {gewichtungsfaktoren.length > 0
                                  ? gewichtungsfaktoren.join(", ")
                                  : "Regelfaktor"}
                              </span>
                              {kind.notizen ? <span>Notiz: {kind.notizen}</span> : null}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell
                        className={cn(warnung !== "rot" && "text-muted-foreground")}
                      >
                        {kind.gruppen?.name ?? "–"}
                      </TableCell>
                      <TableCell>{formatDate(kind.geburtsdatum)}</TableCell>
                      <TableCell>{formatDate(kind.eintritt)}</TableCell>
                      <TableCell
                        className={cn(
                          warnung === "hellrot" && "font-medium text-destructive"
                        )}
                      >
                        {formatDate(kind.austritt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {KIND_STATUS_LABEL[kind.status] ?? kind.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Kinder gefunden.
        </p>
      )}
    </div>
  );
}
