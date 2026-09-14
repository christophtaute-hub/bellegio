import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { addMonthsUtc, parseIsoDate, toIsoDateString, calculateAge } from "@/lib/kita-datum";
import { matchKinderToFreieSlots, type FreierSlot, type WartelisteKind } from "@/lib/warteliste/matching";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEFAULT_MONTH_COUNT = 12;
const MAX_MONTH_COUNT = 24;

function monthStart(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return toIsoDateString(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

function formatMonthLabel(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function WartelistePage({
  searchParams,
}: {
  searchParams: Promise<{ monate?: string }>;
}) {
  const { monate } = await searchParams;
  const monthCount = Math.min(
    MAX_MONTH_COUNT,
    Math.max(1, Number(monate) || DEFAULT_MONTH_COUNT)
  );
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  if (!einrichtungId) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Warteliste &amp; frei werdende Plätze
        </h1>
        <p className="text-sm text-muted-foreground">Keine Einrichtung ausgewählt.</p>
      </div>
    );
  }

  const [{ data: gruppen }, { data: wartelisteRows }] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select(
        "id, vorname, nachname, geburtsdatum, gewuenschte_betreuungsart, eintritt, created_at"
      )
      .eq("einrichtung_id", einrichtungId)
      .eq("status", "geplant")
      .is("gruppe_id", null)
      .is("archived_at", null),
  ]);

  const wartelisteKinder: WartelisteKind[] = (wartelisteRows ?? []).map((k) => ({
    id: k.id,
    vorname: k.vorname,
    nachname: k.nachname,
    geburtsdatum: k.geburtsdatum,
    gewuenschteBetreuungsart: k.gewuenschte_betreuungsart,
    gewuenschterEintritt: k.eintritt,
    erstelltAm: k.created_at,
  }));

  const today = toIsoDateString(new Date());
  const start = monthStart(today);
  const months = Array.from({ length: monthCount }, (_, i) =>
    toIsoDateString(addMonthsUtc(parseIsoDate(start), i))
  );

  const freieSlots: FreierSlot[] = [];
  for (const month of months) {
    const rows = await getKinderPresenceAtDate(supabase, einrichtungId, month);
    const belegtProGruppe = new Map<string, number>();
    for (const row of rows) {
      if (!row.gruppe_id) continue;
      belegtProGruppe.set(row.gruppe_id, (belegtProGruppe.get(row.gruppe_id) ?? 0) + 1);
    }
    for (const gruppe of gruppen ?? []) {
      const belegt = belegtProGruppe.get(gruppe.id) ?? 0;
      const frei = Number(gruppe.sollplatze) - belegt;
      if (frei > 0) {
        freieSlots.push({
          gruppeId: gruppe.id,
          gruppeName: gruppe.name,
          gruppenart: gruppe.gruppenart,
          monat: month,
          anzahlFrei: frei,
        });
      }
    }
  }

  const slotsMitVorschlaegen = matchKinderToFreieSlots(freieSlots, wartelisteKinder);
  const monateMitFreienPlaetzen = Array.from(new Set(freieSlots.map((s) => s.monat)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Warteliste &amp; frei werdende Plätze
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Für jeden Monat: welche Gruppen freie Plätze bekommen und welche
          Wartelisten-Kinder (Alter, gewünschte Betreuungsart, gewünschter
          Eintritt) dafür infrage kommen. Ein Vorschlag ist keine
          automatische Zuweisung — die Einrichtung ordnet manuell zu.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="monate" className="text-xs text-muted-foreground">
            Zeitraum (Monate ab heute)
          </label>
          <Input
            id="monate"
            name="monate"
            type="number"
            min={1}
            max={MAX_MONTH_COUNT}
            defaultValue={monthCount}
            className="h-8 w-24"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Anzeigen
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Warteliste gesamt</h2>
        <p className="text-sm text-muted-foreground">
          {wartelisteKinder.length} Kinder auf der Warteliste (Status
          &bdquo;Geplant&ldquo;, ohne Gruppe).
        </p>
      </div>

      {monateMitFreienPlaetzen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Im gewählten Zeitraum werden keine Plätze frei.
        </p>
      ) : (
        monateMitFreienPlaetzen.map((month) => {
          const slotsDesMonats = slotsMitVorschlaegen.filter(
            (s) => s.slot.monat === month
          );
          return (
            <section key={month} className="flex flex-col gap-3 rounded-xl border p-6">
              <h2 className="font-heading text-lg text-primary">
                {formatMonthLabel(month)}
              </h2>
              <div className="flex flex-col gap-4">
                {slotsDesMonats.map(({ slot, vorschlaege }) => (
                  <div
                    key={slot.gruppeId}
                    className="flex flex-col gap-2 rounded-lg border bg-secondary/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-primary">
                        {slot.gruppeName}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({GRUPPENART_LABEL[slot.gruppenart] ?? slot.gruppenart})
                        </span>
                      </p>
                      <Badge variant="secondary">
                        {slot.anzahlFrei === 1
                          ? "1 freier Platz"
                          : `${slot.anzahlFrei} freie Plätze`}
                      </Badge>
                    </div>
                    {vorschlaege.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Keine passenden Wartelisten-Kinder gefunden.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-sm">
                        {vorschlaege.map((kind) => (
                          <li key={kind.id} className="flex flex-wrap gap-2">
                            <span>
                              {kind.vorname} {kind.nachname} (
                              {calculateAge(kind.geburtsdatum, parseIsoDate(month))} Jahre)
                            </span>
                            {kind.gewuenschterEintritt ? (
                              <span className="text-muted-foreground">
                                gewünschter Eintritt: {kind.gewuenschterEintritt}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
