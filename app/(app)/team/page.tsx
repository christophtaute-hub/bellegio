import Link from "next/link";
import { Users, Scale, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { TEAM_STATUS_LABEL } from "@/lib/constants";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import {
  getTeamPresenceAtDate,
  buildAnstellungsschluessel,
} from "@/lib/team/anstellungsschluessel";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { VollzeitWochenstundenEditor } from "@/components/team/vollzeit-wochenstunden-editor";
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
    fachkraft?: string;
    stichtag?: string;
  }>;
}) {
  const {
    q = "",
    status = "alle",
    fachkraft = "alle",
    stichtag: stichtagParam,
  } = await searchParams;
  const stichtag = stichtagParam ?? toIsoDateString(new Date());
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const [{ data: profile }, { data: einrichtung }] = await Promise.all([
    userData.user
      ? supabase
          .from("user_profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single()
      : Promise.resolve({ data: null }),
    einrichtungId
      ? supabase
          .from("einrichtungen")
          .select("id, vollzeit_wochenstunden")
          .eq("id", einrichtungId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const canEditVollzeit = profile?.role === "traeger_admin";
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;

  const [kinderRows, teamPresenceRows] = einrichtungId
    ? await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
        getTeamPresenceAtDate(supabase, einrichtungId, stichtag),
      ])
    : [[], []];

  const { gewichteteSumme } = buildKpis(kinderRows);
  const anstellungsschluessel = buildAnstellungsschluessel(
    teamPresenceRows,
    gewichteteSumme,
    vollzeitWochenstunden
  );

  let query = supabase
    .from("team")
    .select(
      "id, vorname, nachname, rolle, wochenstunden, fachkraft, status, eintritt, austritt, gruppen(name)"
    )
    .eq("einrichtung_id", einrichtungId ?? "")
    .is("archived_at", null)
    .order("nachname");

  if (status !== "alle") {
    query = query.eq("status", status);
  }
  if (fachkraft !== "alle") {
    query = query.eq("fachkraft", fachkraft === "ja");
  }
  if (q.trim()) {
    query = query.or(`vorname.ilike.%${q.trim()}%,nachname.ilike.%${q.trim()}%`);
  }

  const { data: team } = await query;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-primary">Team</h1>
        <Button nativeButton={false} render={<Link href="/team/neu" />}>
          Personal anlegen
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg text-primary">
            Anstellungsschlüssel (Bayern)
          </h2>
          <AmpelBadge ampel={anstellungsschluessel.ampel} />
        </div>

        <StichtagPicker basePath="/team" stichtag={stichtag} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="Anstellungsschlüssel (Ist)"
            value={
              anstellungsschluessel.anstellungsschluesselIst !== null
                ? formatNumber(anstellungsschluessel.anstellungsschluesselIst, 1)
                : "–"
            }
            icon={Scale}
            tone={
              anstellungsschluessel.anstellungsschluesselIst !== null &&
              anstellungsschluessel.anstellungsschluesselIst > 11
                ? "warn"
                : "default"
            }
          />
          <StatTile
            label="Ist-VZÄ / Soll-VZÄ"
            value={`${formatNumber(anstellungsschluessel.istVzae, 1)} / ${formatNumber(anstellungsschluessel.sollVzae, 1)}`}
            icon={Users}
          />
          <StatTile
            label="Fachkraftquote (Ist)"
            value={
              anstellungsschluessel.fachkraftquoteIst !== null
                ? `${formatNumber(anstellungsschluessel.fachkraftquoteIst * 100, 0)} %`
                : "–"
            }
            icon={GraduationCap}
            tone={
              anstellungsschluessel.fachkraftquoteIst !== null &&
              anstellungsschluessel.fachkraftquoteIst < 0.5
                ? "warn"
                : "default"
            }
          />
          <StatTile
            label="Differenzstunden (Ist − Soll)"
            value={`${anstellungsschluessel.differenzstunden >= 0 ? "+" : ""}${formatNumber(anstellungsschluessel.differenzstunden, 1)} Std.`}
            icon={Scale}
            tone={anstellungsschluessel.differenzstunden < 0 ? "warn" : "default"}
          />
        </div>

        <VollzeitWochenstundenEditor
          einrichtungId={einrichtungId ?? ""}
          vollzeitWochenstunden={vollzeitWochenstunden}
          canEdit={canEditVollzeit}
        />
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
          <label htmlFor="fachkraft" className="text-xs text-muted-foreground">
            Fachkraft
          </label>
          <select
            id="fachkraft"
            name="fachkraft"
            defaultValue={fachkraft}
            className={SELECT_CLASS}
          >
            <option value="alle">Alle</option>
            <option value="ja">Nur Fachkräfte</option>
            <option value="nein">Nur Ergänzungskräfte</option>
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
                <TableHead>Fachkraft</TableHead>
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
                  <TableCell>{mitglied.fachkraft ? "Ja" : "Nein"}</TableCell>
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
