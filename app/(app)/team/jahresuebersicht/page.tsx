import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWritePersonal } from "@/lib/server/current-user-role";
import { berechneJahresuebersicht, summiereJeMonat } from "@/lib/team/jahresuebersicht";
import { AUSFALLZEIT_ART_LABEL } from "@/lib/constants";
import { MonatsstundenZelle } from "@/components/team/monatsstunden-zelle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const MONATSNAMEN = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function formatSumme(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default async function TeamJahresuebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { jahr: jahrParam } = await searchParams;
  const jahr = jahrParam ? Number(jahrParam) : new Date().getFullYear();
  const jahresStart = `${jahr}-01-01`;
  const jahresEnde = `${jahr}-12-31`;

  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [canEdit, { data: team }] = await Promise.all([
    einrichtungId ? canWritePersonal(supabase, einrichtungId) : false,
    einrichtungId
      ? supabase
          .from("team")
          .select("id, vorname, nachname, wochenstunden, eintritt, austritt")
          .eq("einrichtung_id", einrichtungId)
          .is("archived_at", null)
          .lte("eintritt", jahresEnde)
          .or(`austritt.is.null,austritt.gte.${jahresStart}`)
          .order("nachname")
      : { data: null },
  ]);

  const teamIds = (team ?? []).map((t) => t.id);
  const [{ data: monthlyHours }, { data: ausfallzeiten }] = teamIds.length
    ? await Promise.all([
        supabase
          .from("team_monthly_hours")
          .select("team_id, month, wochenstunden")
          .in("team_id", teamIds)
          .gte("month", jahresStart)
          .lte("month", jahresEnde),
        supabase
          .from("team_ausfallzeiten")
          .select("team_id, von, bis, art")
          .in("team_id", teamIds)
          .or(`bis.is.null,bis.gte.${jahresStart}`)
          .lte("von", jahresEnde),
      ])
    : [{ data: [] }, { data: [] }];

  const zeilen = berechneJahresuebersicht(
    (team ?? []).map((t) => ({
      id: t.id,
      wochenstunden: t.wochenstunden !== null ? Number(t.wochenstunden) : null,
      eintritt: t.eintritt,
      austritt: t.austritt,
    })),
    (monthlyHours ?? []).map((h) => ({ team_id: h.team_id, month: h.month, wochenstunden: Number(h.wochenstunden) })),
    ausfallzeiten ?? [],
    jahr
  );
  const zeileByTeamId = new Map(zeilen.map((z) => [z.teamId, z]));
  const summen = summiereJeMonat(zeilen);

  const ausfallzeitenByTeam = new Map<string, { von: string; bis: string | null; art: string }[]>();
  for (const a of ausfallzeiten ?? []) {
    const liste = ausfallzeitenByTeam.get(a.team_id);
    if (liste) liste.push(a);
    else ausfallzeitenByTeam.set(a.team_id, [a]);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight text-primary">Team-Jahresübersicht</h1>
          <p className="text-sm text-muted-foreground">
            Wochenstunden je Monat — wirkt automatisch auf Personal-Forecast, -Bedarf und Controlling.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/team" />} variant="secondary">
          Zur Team-Liste
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href={`/team/jahresuebersicht?jahr=${jahr - 1}`} />} variant="secondary" size="sm">
          ← {jahr - 1}
        </Button>
        <span className="font-medium">{jahr}</span>
        <Button nativeButton={false} render={<Link href={`/team/jahresuebersicht?jahr=${jahr + 1}`} />} variant="secondary" size="sm">
          {jahr + 1} →
        </Button>
      </div>

      {team && team.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Name</TableHead>
                {MONATSNAMEN.map((name) => (
                  <TableHead key={name} className="text-right">
                    {name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((mitglied) => {
                const zeile = zeileByTeamId.get(mitglied.id);
                const eigeneAusfallzeiten = ausfallzeitenByTeam.get(mitglied.id) ?? [];
                return (
                  <TableRow key={mitglied.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      <Link href={`/team/${mitglied.id}`} className="hover:underline">
                        {mitglied.vorname} {mitglied.nachname}
                      </Link>
                      {eigeneAusfallzeiten.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {eigeneAusfallzeiten.map((a) => AUSFALLZEIT_ART_LABEL[a.art] ?? a.art).join(", ")}
                        </p>
                      ) : null}
                    </TableCell>
                    {(zeile?.monate ?? []).map((monat) => (
                      <TableCell key={monat.month} className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <MonatsstundenZelle
                            teamId={mitglied.id}
                            month={monat.month}
                            wochenstunden={monat.wochenstunden}
                            hatEigenenWert={monat.hatEigenenWert}
                            hatVollmonatigeAusfallzeit={monat.hatVollmonatigeAusfallzeit}
                            canEdit={canEdit}
                          />
                          {monat.istEintrittsmonat ? (
                            <span className="text-[10px] text-muted-foreground">Eintritt</span>
                          ) : null}
                          {monat.istAustrittsmonat ? (
                            <span className="text-[10px] text-muted-foreground">Austritt</span>
                          ) : null}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2">
                <TableCell className="sticky left-0 bg-background font-medium">Gesamt</TableCell>
                {summen.map((summe, i) => (
                  <TableCell key={MONATSNAMEN[i]} className="text-right font-medium tabular-nums">
                    {formatSumme(summe)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Kein Personal für {jahr} gefunden.</p>
      )}
    </div>
  );
}
