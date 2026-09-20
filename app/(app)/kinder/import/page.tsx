import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { ImportAssistent } from "@/components/import/import-assistent";
import { kinderVorlage } from "@/lib/import/vorlagen";

export default async function KinderImportPage() {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) notFound();

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();
  const bundesland = einrichtung?.bundesland_code ?? "by";

  const [{ data: gruppen }, { data: baender }] = await Promise.all([
    supabase.from("gruppen").select("name").eq("einrichtung_id", einrichtungId).is("archived_at", null).order("sort_order"),
    supabase.from("booking_time_bands").select("label").eq("bundesland_code", bundesland).order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kinder importieren</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Übernimm deine bestehende Liste aus Excel oder CSV. Vorher müssen die Gruppen angelegt sein, denen die Kinder
          zugeordnet werden.
        </p>
      </div>
      <ImportAssistent
        art="kinder"
        vorlage={kinderVorlage(bundesland, {
          gruppen: (gruppen ?? []).map((g) => g.name),
          baender: (baender ?? []).map((b) => b.label),
        })}
      />
    </div>
  );
}
