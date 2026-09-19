import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { KindForm } from "@/components/kinder/kind-form";
import {
  Aenderungshistorie,
  type AenderungsEintrag,
} from "@/components/kinder/aenderungshistorie";
import type { GruppeFuerPassung } from "@/lib/kinder/gruppen-passung";
import { DruckButton } from "@/components/shared/druck-button";
import { DruckKopf } from "@/components/shared/druck-kopf";
import { GESCHLECHT_LABEL, KIND_STATUS_LABEL } from "@/lib/constants";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";

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
      "id, einrichtung_id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, platznummer, eintritt, austritt, vertrag_gueltig_bis, buchungszeit_band_id, wohnort, notizen, hat_behinderung"
    )
    .eq("id", kindId)
    .single();

  if (!kind || kind.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("name, bundesland_code, standort_gemeinde, auswaertigen_quote_prozent")
    .eq("id", einrichtungId ?? "")
    .single();
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  const [
    { data: gruppen },
    { data: aktiveKinder },
    { data: bookingTimeBands },
    { data: weightingFactors },
    { data: kindWeightingFactors },
  ] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select("id, gruppe_id, geschlecht, wohnort")
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
    supabase
      .from("kind_weighting_factors")
      .select("weighting_factor_id")
      .eq("kind_id", kindId),
  ]);

  const kinderProGruppe = new Map<string, { geschlecht: string }[]>();
  for (const k of aktiveKinder ?? []) {
    if (!k.gruppe_id) continue;
    const liste = kinderProGruppe.get(k.gruppe_id) ?? [];
    liste.push({ geschlecht: k.geschlecht });
    kinderProGruppe.set(k.gruppe_id, liste);
  }
  const gruppenMitKindern: GruppeFuerPassung[] = (gruppen ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    gruppenart: g.gruppenart,
    sollplatze: Number(g.sollplatze),
    aktiveKinder: kinderProGruppe.get(g.id) ?? [],
  }));

  const { data: auditLog } = await supabase
    .from("kinder_audit_log")
    .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
    .eq("kind_id", kindId)
    .order("changed_at", { ascending: false });

  const aenderungen: AenderungsEintrag[] = (auditLog ?? []).map((entry) => ({
    id: entry.id,
    changed_at: entry.changed_at,
    changed_by_name: entry.user_profiles?.full_name ?? null,
    old_data: entry.old_data as Record<string, unknown> | null,
    new_data: entry.new_data as Record<string, unknown>,
  }));

  const auswaertigenQuote =
    bundeslandCode === "bw" &&
    einrichtung?.standort_gemeinde &&
    einrichtung?.auswaertigen_quote_prozent !== null &&
    einrichtung?.auswaertigen_quote_prozent !== undefined
      ? {
          standortGemeinde: einrichtung.standort_gemeinde,
          auswaertigenQuoteProzent: Number(einrichtung.auswaertigen_quote_prozent),
          bestehendeWohnorte: (aktiveKinder ?? [])
            .filter((k) => k.id !== kind.id)
            .map((k) => k.wohnort),
        }
      : undefined;

  const gewichtungsLabels = (weightingFactors ?? [])
    .filter((w) => (kindWeightingFactors ?? []).some((k) => k.weighting_factor_id === w.id))
    .map((w) => w.label);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl text-primary">
          {kind.vorname} {kind.nachname}
        </h1>
        <DruckButton />
      </div>
      <DruckKopf
        titel="Änderungsverlauf — Kind"
        untertitel={`${einrichtung?.name ?? ""} · Stand ${formatDate(toIsoDateString(new Date()))}`}
        felder={[
          { label: "Name", wert: `${kind.vorname} ${kind.nachname}` },
          { label: "Geburtsdatum", wert: formatDate(kind.geburtsdatum) },
          { label: "Geschlecht", wert: GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht },
          { label: "Status", wert: KIND_STATUS_LABEL[kind.status] ?? kind.status },
          { label: "Gruppe", wert: (gruppen ?? []).find((g) => g.id === kind.gruppe_id)?.name ?? "" },
          { label: "Eintritt", wert: formatDate(kind.eintritt) },
          { label: "Austritt", wert: formatDate(kind.austritt) },
          {
            label: "Buchungszeit",
            wert: (bookingTimeBands ?? []).find((b) => b.id === kind.buchungszeit_band_id)?.label ?? "",
          },
          { label: "Gewichtung", wert: gewichtungsLabels.join(", ") },
          { label: "I-Status", wert: kind.hat_behinderung ? "Ja" : "Nein" },
          { label: "Wohnort", wert: kind.wohnort ?? "" },
          { label: "Notizen", wert: kind.notizen ?? "" },
        ]}
      />
      <div className="print:hidden">
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
          vertrag_gueltig_bis: kind.vertrag_gueltig_bis ?? "",
          buchungszeit_band_id: kind.buchungszeit_band_id ?? "",
          wohnort: kind.wohnort ?? "",
          notizen: kind.notizen ?? "",
          hat_behinderung: kind.hat_behinderung,
          weighting_factor_ids: (kindWeightingFactors ?? []).map(
            (row) => row.weighting_factor_id
          ),
        }}
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
      <Aenderungshistorie eintraege={aenderungen} />
    </div>
  );
}
