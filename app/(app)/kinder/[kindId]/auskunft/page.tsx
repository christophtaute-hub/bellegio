import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { AuskunftDokument, type AuskunftEintrag } from "@/components/datenschutz/auskunft-dokument";
import { berechneAenderungen, KIND_FELDER } from "@/lib/datenschutz/auskunft";
import { GESCHLECHT_LABEL, KIND_STATUS_LABEL } from "@/lib/constants";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";

export default async function KindAuskunftPage({ params }: { params: Promise<{ kindId: string }> }) {
  const { kindId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) notFound();

  const { data: kind } = await supabase.from("kinder").select("*").eq("id", kindId).single();
  if (!kind || kind.einrichtung_id !== einrichtungId) notFound();

  const [{ data: einrichtung }, { data: gruppen }, { data: baender }, { data: faktoren }, { data: kindFaktoren }, { data: auditLog }, { data: notizenRoh }] = await Promise.all([
    supabase
      .from("einrichtungen")
      .select("name, address_street, address_zip, address_city, loeschfrist_monate, bundesland_code, trager(name)")
      .eq("id", einrichtungId)
      .single(),
    supabase.from("gruppen").select("id, name").eq("einrichtung_id", einrichtungId),
    supabase.from("booking_time_bands").select("id, label"),
    supabase.from("weighting_factors").select("id, label"),
    supabase.from("kind_weighting_factors").select("weighting_factor_id").eq("kind_id", kindId),
    supabase
      .from("kinder_audit_log")
      .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
      .eq("kind_id", kindId)
      .order("changed_at", { ascending: true }),
    supabase
      .from("kind_notizen_verlauf")
      .select("text, erstellt_am, user_profiles(full_name)")
      .eq("kind_id", kindId)
      .order("erstellt_am", { ascending: true }),
  ]);

  const gruppeName = (id: unknown) => (gruppen ?? []).find((g) => g.id === id)?.name ?? null;
  const bandLabel = (id: unknown) => (baender ?? []).find((b) => b.id === id)?.label ?? null;
  const aufloesen = (feld: string, wert: unknown) => (feld === "gruppe_id" ? gruppeName(wert) : feld === "buchungszeit_band_id" ? bandLabel(wert) : null);

  const verlauf: AuskunftEintrag[] = (auditLog ?? []).map((e) => ({
    zeitpunkt: new Date(e.changed_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }),
    von: e.user_profiles?.full_name ?? "Unbekannt",
    art: e.old_data ? "Geändert" : "Angelegt",
    aenderungen: berechneAenderungen(e.old_data as Record<string, unknown> | null, e.new_data as Record<string, unknown>, KIND_FELDER, aufloesen),
  }));

  const gewichtungen = (faktoren ?? []).filter((f) => (kindFaktoren ?? []).some((k) => k.weighting_factor_id === f.id)).map((f) => f.label);
  const notizenText = (notizenRoh ?? [])
    .map((n) => `${formatDate(n.erstellt_am.slice(0, 10))} — ${n.user_profiles?.full_name ?? "Unbekannt"}: ${n.text}`)
    .join("\n");
  const trager = (einrichtung?.trager as unknown as { name: string } | null)?.name ?? "";
  const anschrift = [einrichtung?.address_street, [einrichtung?.address_zip, einrichtung?.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <AuskunftDokument
      betroffene={{ art: "Kind", name: `${kind.vorname} ${kind.nachname}` }}
      verantwortlicher={{ trager, einrichtung: einrichtung?.name ?? "", anschrift }}
      stand={formatDate(toIsoDateString(new Date()))}
      loeschfristMonate={einrichtung?.loeschfrist_monate ?? null}
      felder={[
        { label: "Vorname", wert: kind.vorname },
        { label: "Nachname", wert: kind.nachname },
        { label: "Geburtsdatum", wert: formatDate(kind.geburtsdatum) },
        { label: "Geschlecht", wert: GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht },
        { label: "Status", wert: KIND_STATUS_LABEL[kind.status] ?? kind.status },
        { label: "Gruppe", wert: gruppeName(kind.gruppe_id) ?? "" },
        { label: "Eintritt", wert: formatDate(kind.eintritt) },
        { label: "Austritt", wert: formatDate(kind.austritt) },
        { label: "Vertrag gültig bis", wert: formatDate(kind.vertrag_gueltig_bis) },
        { label: "Buchungszeit", wert: bandLabel(kind.buchungszeit_band_id) ?? "" },
        { label: "Gewichtung", wert: gewichtungen.join(", ") },
        { label: "I-Status", wert: kind.hat_behinderung ? "Ja" : "Nein" },
        { label: "Wohnort", wert: kind.wohnort ?? "" },
        { label: "Einschulungsstatus", wert: kind.einschulungsstatus ?? "" },
        { label: "Notizen (Verlauf)", wert: notizenText },
      ]}
      verlauf={verlauf}
    />
  );
}
