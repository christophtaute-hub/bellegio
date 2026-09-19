import { createClient } from "@/lib/supabase/server";
import { AnfrageStatusButton } from "@/components/admin/anfrage-status-button";
import { Badge } from "@/components/ui/badge";

const BUNDESLAND: Record<string, string> = {
  by: "Bayern",
  bw: "Baden-Württemberg",
  nrw: "Nordrhein-Westfalen",
  andere: "Anderes Bundesland",
};

export default async function AnfragenPage() {
  const supabase = await createClient();
  const { data: anfragen } = await supabase
    .from("demo_anfragen")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Demo-Anfragen</h1>
        <p className="text-sm text-muted-foreground">Eingänge des Kontaktformulars auf der Landingpage.</p>
      </div>

      {anfragen && anfragen.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {anfragen.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-xl border bg-secondary/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.name}</span>
                <span className="text-sm text-muted-foreground">{a.organisation}</span>
                <Badge variant="secondary">{BUNDESLAND[a.bundesland] ?? a.bundesland}</Badge>
                <Badge variant={a.status === "neu" ? "default" : "outline"}>
                  {a.status === "neu" ? "Neu" : "Bearbeitet"}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {new Date(a.created_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <a href={`mailto:${a.email}`} className="text-sm text-primary underline-offset-2 hover:underline">
                {a.email}
              </a>
              {a.nachricht ? <p className="whitespace-pre-line text-sm">{a.nachricht}</p> : null}
              <div>
                <AnfrageStatusButton id={a.id} status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Anfragen.</p>
      )}
    </div>
  );
}
