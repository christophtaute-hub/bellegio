import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { TeamForm } from "@/components/team/team-form";

export default async function TeamNeuPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: gruppen } = await supabase
    .from("gruppen")
    .select("id, name")
    .eq("einrichtung_id", einrichtungId ?? "")
    .is("archived_at", null)
    .order("sort_order");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Personal anlegen</h1>
      <TeamForm
        mode="create"
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
      />
    </div>
  );
}
