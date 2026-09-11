import Link from "next/link";
import { Scale, GraduationCap, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { TEAM_STATUS_LABEL, TEAM_ROLE_CATEGORY_LABEL } from "@/lib/constants";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import {
  getTeamPresenceForMonth,
  buildPersonalplanung,
} from "@/lib/team/anstellungsschluessel";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    kategorie?: string;
    stichtag?: string;
  }>;
}) {
  const {
    q = "",
    status = "alle",
    kategorie = "alle",
    stichtag: stichtagParam,
  } = await searchParams;
  const stichtag = stichtagParam ?? toIsoDateString(new Date());
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [{ data: gruppen }] = await Promise.all([
    einrichtungId
      ? supabase
          .from("gruppen")
          .select("id")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
      : Promise.resolve({ data: null }),
  ]);
  const gruppenAnzahl = gruppen?.length ?? 0;

  const [kinderRows, teamPresenceRows] = einrichtungId
    ? await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
        getTeamPresenceForMonth(supabase, einrichtungId, stichtag),
      ])
    : [[], []];

  const { gewichteteSumme } = buildKpis(kinderRows);
  const personal = buildPersonalplanung(
    teamPresenceRows,
    gewichteteSumme,
    gruppenAnzahl
  );

  let query = supabase
    .from("team")
    .select(
      "id, vorname, nachname, rolle, wochenstunden, role_category, status, eintritt, austritt, gruppen(name)"
    )
    .eq("einrichtung_id", einrichtungId ?? "")
    .is("archived_at", null)
    .order("nachname");

  if (status !== "alle") {
    query = query.eq("status", status);
  }
  if (kategorie !== "alle") {
    query = query.eq("role_category", kategorie);
  }
  if (q.trim()) {
    query = query.or(`vorname.ilike.%${q.trim()}%,nachname.ilike.%${q.trim()}%`);
  }

  const { data: team } = await query;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Team</h1>
        <Button nativeButton={false} render={<Link href="/team/neu" />}>
          Personal anlegen
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg text-primary">
            Anstellungsschlüssel (Bayern)
          </h2>
          <AmpelBadge ampel={personal.ampel} />
        </div>

        <StichtagPicker basePath="/team" stichtag={stichtag} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="Anstellungsschlüssel"
            value={
              personal.anstellungsschluessel !== null
                ? `1 : ${formatNumber(personal.anstellungsschluessel, 2)}`
                : "–"
            }
            icon={Scale}
            tone={!personal.mindestschluesselOk ? "warn" : "default"}
          />
          <StatTile
            label="Ist-FK / Soll-FK"
            value={`${formatNumber(personal.istFk, 1)} / ${formatNumber(personal.sollFk, 1)}`}
            icon={Users}
          />
          <StatTile
            label="Ist-EK"
            value={`${formatNumber(personal.istEk, 1)} Std.`}
            icon={GraduationCap}
          />
          <StatTile
            label="Ist-AZ pro Gruppe"
            value={`${formatNumber(personal.istAzProTagGesamt, 1)} Std.`}
            icon={Scale}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={personal.mindestschluesselOk ? "secondary" : "destructive"}>
            Mindestschlüssel 1:11,0: {personal.mindestschluesselOk ? "Ja" : "Nein"}
          </Badge>
          <Badge
            variant={personal.empfohlenerSchluesselOk ? "secondary" : "destructive"}
          >
            Empfohlener Schlüssel 1:10: {personal.empfohlenerSchluesselOk ? "Ja" : "Nein"}
          </Badge>
          <Badge
            variant={personal.qualifikationsschluesselOk ? "secondary" : "destructive"}
          >
            Qualifikationsschlüssel: {personal.qualifikationsschluesselOk ? "Ja" : "Nein"}
          </Badge>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="stichtag" value={stichtag} />
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
            <option value="inaktiv">Inaktiv</option>
            <option value="geplant">Geplant</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kategorie" className="text-xs text-muted-foreground">
            Kategorie
          </label>
          <select
            id="kategorie"
            name="kategorie"
            defaultValue={kategorie}
            className={SELECT_CLASS}
          >
            <option value="alle">Alle</option>
            {Object.entries(TEAM_ROLE_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Filtern
        </Button>
      </form>

      {team && team.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Gruppe</TableHead>
                <TableHead>Wochenstunden</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((mitglied) => (
                <TableRow key={mitglied.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/team/${mitglied.id}`}
                      className="hover:underline"
                    >
                      {mitglied.vorname} {mitglied.nachname}
                    </Link>
                  </TableCell>
                  <TableCell>{mitglied.rolle ?? "–"}</TableCell>
                  <TableCell>{mitglied.gruppen?.name ?? "–"}</TableCell>
                  <TableCell>
                    {mitglied.wochenstunden !== null
                      ? `${mitglied.wochenstunden} Std.`
                      : "–"}
                  </TableCell>
                  <TableCell>
                    {TEAM_ROLE_CATEGORY_LABEL[mitglied.role_category] ??
                      mitglied.role_category}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TEAM_STATUS_LABEL[mitglied.status] ?? mitglied.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Kein Personal gefunden.
        </p>
      )}
    </div>
  );
}
