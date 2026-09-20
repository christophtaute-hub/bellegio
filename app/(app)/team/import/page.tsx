import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWritePersonal } from "@/lib/server/current-user-role";
import { ImportAssistent } from "@/components/import/import-assistent";
import { teamVorlage } from "@/lib/import/vorlagen";

export default async function TeamImportPage() {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWritePersonal(supabase, einrichtungId))) notFound();

  const { data: gruppen } = await supabase
    .from("gruppen")
    .select("name")
    .eq("einrichtung_id", einrichtungId)
    .is("archived_at", null)
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Personal importieren</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Übernimm dein Team aus Excel oder CSV. Wochenstunden und Kategorie (Fachkraft, Ergänzungskraft …) bestimmen
          den Personalschlüssel.
        </p>
      </div>
      <ImportAssistent art="team" vorlage={teamVorlage({ gruppen: (gruppen ?? []).map((g) => g.name), baender: [] })} />
    </div>
  );
}
