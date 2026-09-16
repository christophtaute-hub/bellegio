import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
import { KinderExportButtons } from "@/components/kinder/kinder-export-buttons";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const SORT_SPALTEN = [
  "name",
  "gruppe",
  "geburtsdatum",
  "eintritt",
  "austritt",
  "status",
] as const;
type SortSpalte = (typeof SORT_SPALTEN)[number];

function istSortSpalte(value: string | undefined): value is SortSpalte {
  return SORT_SPALTEN.includes(value as SortSpalte);
}

/** ISO-Datumsstrings vergleichen sich lexikalisch korrekt; fehlende Werte
 * werden unabhängig von der Richtung ans Ende sortiert. */
function vergleicheNullableDatum(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

type SortierbaresKind = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  eintritt: string | null;
  austritt: string | null;
  status: string;
  gruppen: { name: string } | null;
};

function sortiereKinder<T extends SortierbaresKind>(
  kinder: T[],
  spalte: SortSpalte,
  richtung: "asc" | "desc"
): T[] {
  const vorzeichen = richtung === "desc" ? -1 : 1;
  return [...kinder].sort((a, b) => {
    switch (spalte) {
      case "name":
        return (
          vorzeichen *
          `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, "de")
        );
      case "gruppe":
        return (
          vorzeichen *
          (a.gruppen?.name ?? "").localeCompare(b.gruppen?.name ?? "", "de")
        );
      case "geburtsdatum":
        return vorzeichen * a.geburtsdatum.localeCompare(b.geburtsdatum);
      case "eintritt":
        return vorzeichen * vergleicheNullableDatum(a.eintritt, b.eintritt);
      case "austritt":
        return vorzeichen * vergleicheNullableDatum(a.austritt, b.austritt);
      case "status":
        return vorzeichen * a.status.localeCompare(b.status, "de");
      default:
        return 0;
    }
  });
}

function SortableHead({
  spalte,
  label,
  aktuelleSpalte,
  aktuelleRichtung,
  query,
}: {
  spalte: SortSpalte;
  label: string;
  aktuelleSpalte: SortSpalte;
  aktuelleRichtung: "asc" | "desc";
  query: { q: string; status: string; gruppe: string };
}) {
  const istAktiv = spalte === aktuelleSpalte;
  const naechsteRichtung = istAktiv && aktuelleRichtung === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "alle") params.set("status", query.status);
  if (query.gruppe !== "alle") params.set("gruppe", query.gruppe);
  params.set("sort", spalte);
  params.set("dir", naechsteRichtung);

  const Icon = !istAktiv ? ArrowUpDown : aktuelleRichtung === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead>
      <Link
        href={`/kinder?${params.toString()}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          istAktiv && "font-semibold text-foreground"
        )}
      >
        {label}
        <Icon className="size-3.5 text-muted-foreground" />
      </Link>
    </TableHead>
  );
}

export default async function KinderPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    gruppe?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const {
    q = "",
    status = "alle",
    gruppe = "alle",
    sort: sortParam,
    dir: dirParam,
  } = await searchParams;
  const sort: SortSpalte = istSortSpalte(sortParam) ? sortParam : "geburtsdatum";
  const dir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";
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
    .is("archived_at", null);

  if (status !== "alle") {
    query = query.eq("status", status);
  }
  if (gruppe !== "alle") {
    query = query.eq("gruppe_id", gruppe);
  }
  if (q.trim()) {
    query = query.or(`vorname.ilike.%${q.trim()}%,nachname.ilike.%${q.trim()}%`);
  }

  const { data: kinderRoh } = await query;
  // Sortierung passiert clientseitig statt über PostgREST: eine Sortierung
  // über die eingebettete gruppen(name)-Relation würde ohne !inner-Join
  // die Reihenfolge der Kinder-Zeilen gar nicht beeinflussen — !inner
  // wiederum würde Kinder ohne Gruppe (z.B. Nachrücker) aus der Liste
  // werfen. Bei den hier üblichen Listengrößen (einzelne Kitas) ist ein
  // JS-Sort unproblematisch.
  const kinder = kinderRoh ? sortiereKinder(kinderRoh, sort, dir) : null;

  const exportRows = (kinder ?? []).map((kind) => ({
    Name: `${kind.vorname} ${kind.nachname}`,
    Gruppe: kind.gruppen?.name ?? "–",
    Geburtstag: formatDate(kind.geburtsdatum),
    Eintritt: formatDate(kind.eintritt),
    Austritt: formatDate(kind.austritt),
    Status: KIND_STATUS_LABEL[kind.status] ?? kind.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kinder</h1>
        <div className="flex items-center gap-2">
          <KinderExportButtons rows={exportRows} />
          {canEditBelegung ? (
            <Button nativeButton={false} render={<Link href="/kinder/neu" />}>
              Kind anlegen
            </Button>
          ) : null}
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden" method="get">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
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
                  <SortableHead spalte="name" label="Name" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
                  <SortableHead spalte="gruppe" label="Gruppe" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
                  <SortableHead spalte="geburtsdatum" label="Geburtstag" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
                  <SortableHead spalte="eintritt" label="Eintritt" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
                  <SortableHead spalte="austritt" label="Austritt" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
                  <SortableHead spalte="status" label="Status" aktuelleSpalte={sort} aktuelleRichtung={dir} query={{ q, status, gruppe }} />
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
                      <TableCell className="tabular-nums">
                        {formatDate(kind.geburtsdatum)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(kind.eintritt)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "tabular-nums",
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
