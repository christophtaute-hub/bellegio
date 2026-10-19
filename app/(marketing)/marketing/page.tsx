import { createClient } from "@/lib/supabase/server";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";

/** Marketing-Dashboard (Fundament): alle Einrichtungen des Trägers mit Stammdaten. Ampeln, Kampagnen und Hinweise folgen. */
export default async function MarketingDashboardPage() {
  const supabase = await createClient();
  const { data: einrichtungen } = await supabase.rpc("marketing_einrichtungen");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">Marketing-Ampel</h1>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Kostenstelle</th>
              <th className="px-3 py-2.5 font-medium">Einrichtung</th>
              <th className="px-3 py-2.5 font-medium">Bundesland</th>
              <th className="px-3 py-2.5 font-medium">Cluster</th>
            </tr>
          </thead>
          <tbody>
            {(einrichtungen ?? []).map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{e.kostenstelle ?? "–"}</td>
                <td className="px-3 py-2.5 font-medium">{e.name}</td>
                <td className="px-3 py-2.5">{BUNDESLAENDER.find((b) => b.code === e.bundesland_code)?.label ?? e.bundesland_code}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{e.cluster ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
