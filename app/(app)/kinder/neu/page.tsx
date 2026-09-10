import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { KindForm } from "@/components/kinder/kind-form";

export default async function KindNeuPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const [{ data: gruppen }, { data: bookingTimeBands }, { data: weightingFactors }] =
    await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name")
        .eq("einrichtung_id", einrichtungId ?? "")
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("booking_time_bands")
        .select("id, label")
        .order("sort_order"),
      supabase.from("weighting_factors").select("id, label"),
    ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Kind anlegen</h1>
      <KindForm
        mode="create"
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
        bookingTimeBands={(bookingTimeBands ?? []).map((b) => ({
          id: b.id,
          label: b.label,
        }))}
        weightingFactors={(weightingFactors ?? []).map((w) => ({
          id: w.id,
          label: w.label,
        }))}
      />
    </div>
  );
}
