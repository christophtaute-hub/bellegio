import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWritePersonal } from "@/lib/server/current-user-role";
import { AuskunftDokument, type AuskunftEintrag } from "@/components/datenschutz/auskunft-dokument";
import { berechneAenderungen, TEAM_FELDER } from "@/lib/datenschutz/auskunft";
import { AUSFALLZEIT_ART_LABEL, TEAM_ROLE_CATEGORY_LABEL, TEAM_STATUS_LABEL } from "@/lib/constants";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";

export default async function TeamAuskunftPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWritePersonal(supabase, einrichtungId))) notFound();

  const { data: person } = await supabase.from("team").select("*").eq("id", teamId).single();
  if (!person || person.einrichtung_id !== einrichtungId) notFound();

  const [{ data: einrichtung }, { data: gruppen }, { data: ausfall }, { data: auditLog }] = await Promise.all([
    supabase
      .from("einrichtungen")
      .select("name, address_street, address_zip, address_city, loeschfrist_monate, trager(name)")
      .eq("id", einrichtungId)
      .single(),
    supabase.from("gruppen").select("id, name").eq("einrichtung_id", einrichtungId),
    supabase.from("team_ausfallzeiten").select("art, von, bis, notizen").eq("team_id", teamId).order("von", { ascending: true }),
    supabase
      .from("team_audit_log")
      .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
      .eq("team_id", teamId)
      .order("changed_at", { ascending: true }),
  ]);

  const gruppeName = (id: unknown) => (gruppen ?? []).find((g) => g.id === id)?.name ?? null;
  const verlauf: AuskunftEintrag[] = (auditLog ?? []).map((e) => ({
    zeitpunkt: new Date(e.changed_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }),
    von: e.user_profiles?.full_name ?? "Unbekannt",
    art: e.old_data ? "Geändert" : "Angelegt",
    aenderungen: berechneAenderungen(e.old_data as Record<string, unknown> | null, e.new_data as Record<string, unknown>, TEAM_FELDER, (f, w) =>
      f === "gruppe_id" ? gruppeName(w) : null
    ),
  }));

  const name = `${person.vorname ?? ""} ${person.nachname ?? ""}`.trim();
  const trager = (einrichtung?.trager as unknown as { name: string } | null)?.name ?? "";
  const anschrift = [einrichtung?.address_street, [einrichtung?.address_zip, einrichtung?.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <AuskunftDokument
      betroffene={{ art: "Person", name }}
      verantwortlicher={{ trager, einrichtung: einrichtung?.name ?? "", anschrift }}
      stand={formatDate(toIsoDateString(new Date()))}
      loeschfristMonate={einrichtung?.loeschfrist_monate ?? null}
      felder={[
        { label: "Vorname", wert: person.vorname ?? "" },
        { label: "Nachname", wert: person.nachname ?? "" },
        { label: "Rolle", wert: person.rolle ?? "" },
        { label: "Kategorie", wert: TEAM_ROLE_CATEGORY_LABEL[person.role_category] ?? person.role_category },
        { label: "Gruppe", wert: gruppeName(person.gruppe_id) ?? "" },
        { label: "Wochenstunden", wert: person.wochenstunden !== null ? String(person.wochenstunden) : "" },
        { label: "Status", wert: TEAM_STATUS_LABEL[person.status] ?? person.status },
        { label: "Eintritt", wert: formatDate(person.eintritt) },
        { label: "Austritt", wert: formatDate(person.austritt) },
      ]}
      weitere={{
        titel: "Ausfallzeiten",
        zeilen: (ausfall ?? []).map(
          (a) => `${AUSFALLZEIT_ART_LABEL[a.art] ?? a.art}: ${formatDate(a.von)} – ${a.bis ? formatDate(a.bis) : "offen"}${a.notizen ? ` (${a.notizen})` : ""}`
        ),
      }}
      verlauf={verlauf}
    />
  );
}
