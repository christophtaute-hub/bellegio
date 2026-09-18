import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { KindForm } from "@/components/kinder/kind-form";
import type { GruppeFuerPassung } from "@/lib/kinder/gruppen-passung";

export default async function KindNeuPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("bundesland_code, standort_gemeinde, auswaertigen_quote_prozent")
        .eq("id", einrichtungId)
        .single()
    : { data: null };
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  const [
    { data: gruppen },
    { data: aktiveKinder },
    { data: bookingTimeBands },
    { data: weightingFactors },
  ] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select("gruppe_id, geschlecht, wohnort")
      .eq("einrichtung_id", einrichtungId ?? "")
      .eq("status", "aktiv")
      .is("archived_at", null),
    supabase
      .from("booking_time_bands")
      .select("id, label")
      .eq("bundesland_code", bundeslandCode)
      .order("sort_order"),
    supabase
      .from("weighting_factors")
      .select("id, label, code")
      .eq("bundesland_code", bundeslandCode),
  ]);

  const kinderProGruppe = new Map<string, { geschlecht: string }[]>();
  for (const kind of aktiveKinder ?? []) {
    if (!kind.gruppe_id) continue;
    const liste = kinderProGruppe.get(kind.gruppe_id) ?? [];
    liste.push({ geschlecht: kind.geschlecht });
    kinderProGruppe.set(kind.gruppe_id, liste);
  }
  const gruppenMitKindern: GruppeFuerPassung[] = (gruppen ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    gruppenart: g.gruppenart,
    sollplatze: Number(g.sollplatze),
    aktiveKinder: kinderProGruppe.get(g.id) ?? [],
  }));

  const auswaertigenQuote =
    bundeslandCode === "bw" &&
    einrichtung?.standort_gemeinde &&
    einrichtung?.auswaertigen_quote_prozent !== null &&
    einrichtung?.auswaertigen_quote_prozent !== undefined
      ? {
          standortGemeinde: einrichtung.standort_gemeinde,
          auswaertigenQuoteProzent: Number(einrichtung.auswaertigen_quote_prozent),
          bestehendeWohnorte: (aktiveKinder ?? []).map((k) => k.wohnort),
        }
      : undefined;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Kind anlegen</h1>
      <KindForm
        mode="create"
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
        gruppenMitKindern={gruppenMitKindern}
        bookingTimeBands={(bookingTimeBands ?? []).map((b) => ({
          id: b.id,
          label: b.label,
        }))}
        weightingFactors={(weightingFactors ?? []).map((w) => ({
          id: w.id,
          label: w.label,
          code: w.code,
        }))}
        auswaertigenQuote={auswaertigenQuote}
      />
    </div>
  );
}
