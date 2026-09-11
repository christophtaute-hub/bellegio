import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { KindForm } from "@/components/kinder/kind-form";

export default async function KindDetailPage({
  params,
}: {
  params: Promise<{ kindId: string }>;
}) {
  const { kindId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: kind } = await supabase
    .from("kinder")
    .select(
      "id, einrichtung_id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, platznummer, eintritt, austritt, buchungszeit_band_id, notizen"
    )
    .eq("id", kindId)
    .single();

  if (!kind || kind.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const [
    { data: gruppen },
    { data: bookingTimeBands },
    { data: weightingFactors },
    { data: kindWeightingFactors },
  ] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    supabase.from("booking_time_bands").select("id, label").order("sort_order"),
    supabase.from("weighting_factors").select("id, label"),
    supabase
      .from("kind_weighting_factors")
      .select("weighting_factor_id")
      .eq("kind_id", kindId),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">
        {kind.vorname} {kind.nachname}
      </h1>
      <KindForm
        mode="edit"
        kindId={kind.id}
        defaultValues={{
          vorname: kind.vorname,
          nachname: kind.nachname,
          geburtsdatum: kind.geburtsdatum,
          geschlecht: kind.geschlecht as
            | "maennlich"
            | "weiblich"
            | "divers"
            | "keine_angabe",
          status: kind.status as "aktiv" | "nachruecker" | "geplant",
          gruppe_id: kind.gruppe_id ?? "",
          platznummer: kind.platznummer ?? "",
          eintritt: kind.eintritt ?? "",
          austritt: kind.austritt ?? "",
          buchungszeit_band_id: kind.buchungszeit_band_id ?? "",
          notizen: kind.notizen ?? "",
          weighting_factor_ids: (kindWeightingFactors ?? []).map(
            (row) => row.weighting_factor_id
          ),
        }}
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
