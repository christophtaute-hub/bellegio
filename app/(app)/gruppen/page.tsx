import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "text-lg font-medium text-destructive"
            : "text-lg font-medium"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default async function GruppenPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [{ data: gruppen }, { data: platzwerte }, { data: nachruecker }] =
    await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name, sollplatze, gruppenart")
        .eq("einrichtung_id", einrichtungId ?? "")
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("children_place_calculation_view")
        .select("gruppe_id, platzwert")
        .eq("einrichtung_id", einrichtungId ?? ""),
      supabase
        .from("kinder")
        .select("gruppe_id")
        .eq("einrichtung_id", einrichtungId ?? "")
        .eq("status", "nachruecker")
        .is("archived_at", null),
    ]);

  const belegteByGruppe = new Map<string, number>();
  for (const row of platzwerte ?? []) {
    if (!row.gruppe_id) continue;
    belegteByGruppe.set(
      row.gruppe_id,
      (belegteByGruppe.get(row.gruppe_id) ?? 0) + Number(row.platzwert)
    );
  }

  const nachrueckerByGruppe = new Map<string, number>();
  for (const row of nachruecker ?? []) {
    if (!row.gruppe_id) continue;
    nachrueckerByGruppe.set(
      row.gruppe_id,
      (nachrueckerByGruppe.get(row.gruppe_id) ?? 0) + 1
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Gruppen</h1>

      {gruppen && gruppen.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gruppen.map((gruppe) => {
            const belegt = belegteByGruppe.get(gruppe.id) ?? 0;
            const frei = Number(gruppe.sollplatze) - belegt;
            const nachrueckerCount = nachrueckerByGruppe.get(gruppe.id) ?? 0;

            return (
              <Link key={gruppe.id} href={`/gruppen/${gruppe.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{gruppe.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {GRUPPENART_LABEL[gruppe.gruppenart] ?? gruppe.gruppenart}
                    </Badge>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Stat label="Sollplätze" value={String(gruppe.sollplatze)} />
                      <Stat label="Belegt" value={belegt.toFixed(1)} />
                      <Stat
                        label={frei < 0 ? "Überbelegt" : "Frei"}
                        value={Math.abs(frei).toFixed(1)}
                        tone={frei < 0 ? "warn" : "default"}
                      />
                      <Stat label="Nachrücker" value={String(nachrueckerCount)} />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine Gruppen angelegt.
        </p>
      )}
    </div>
  );
}
