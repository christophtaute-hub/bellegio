import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { TEAM_STATUS_LABEL, TEAM_ROLE_CATEGORY_LABEL } from "@/lib/constants";
import { getPersonalplanungFuerEinrichtung } from "@/lib/team/personalplanung";
import { PersonalplanungBayern } from "@/components/team/personalplanung-bayern";
import { PersonalplanungBW } from "@/components/team/personalplanung-bw";
import { PersonalplanungNRW } from "@/components/team/personalplanung-nrw";
import { GruppeQuickSelect } from "@/components/team/gruppe-quick-select";
import { canWritePersonal } from "@/lib/server/current-user-role";
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

  const [{ data: gruppen }, canEditPersonal, personalplanung] = await Promise.all([
    einrichtungId
      ? supabase
          .from("gruppen")
          .select("id, name")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
          .order("name")
      : Promise.resolve({ data: null }),
    einrichtungId ? canWritePersonal(supabase, einrichtungId) : false,
    einrichtungId
      ? getPersonalplanungFuerEinrichtung(supabase, einrichtungId, stichtag)
      : null,
  ]);

  let query = supabase
    .from("team")
    .select(
      "id, vorname, nachname, rolle, wochenstunden, role_category, status, eintritt, austritt, gruppe_id, gruppen(name)"
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
        {canEditPersonal ? (
          <div className="flex items-center gap-2">
            <Button nativeButton={false} render={<Link href="/team/import" />} variant="secondary">
              Aus Excel importieren
            </Button>
            <Button nativeButton={false} render={<Link href="/team/neu" />}>
              Personal anlegen
            </Button>
          </div>
        ) : null}
      </div>

      {personalplanung?.modell === "bayern" ? (
        <PersonalplanungBayern
          personal={personalplanung.daten}
          stichtag={stichtag}
          basePath="/team"
        />
      ) : personalplanung?.modell === "bw" ? (
        <PersonalplanungBW
          daten={personalplanung.daten}
          stichtag={stichtag}
          basePath="/team"
        />
      ) : personalplanung?.modell === "nrw" ? (
        <PersonalplanungNRW
          daten={personalplanung.daten}
          stichtag={stichtag}
          basePath="/team"
        />
      ) : null}

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
                  <TableCell>
                    <GruppeQuickSelect
                      teamId={mitglied.id}
                      gruppeId={mitglied.gruppe_id}
                      gruppen={gruppen ?? []}
                      canEdit={canEditPersonal}
                    />
                  </TableCell>
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
