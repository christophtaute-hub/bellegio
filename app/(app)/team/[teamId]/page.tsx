import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { TeamForm } from "@/components/team/team-form";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: mitglied } = await supabase
    .from("team")
    .select(
      "id, einrichtung_id, vorname, nachname, rolle, gruppe_id, wochenstunden, fachkraft, status, eintritt, austritt"
    )
    .eq("id", teamId)
    .single();

  if (!mitglied || mitglied.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const { data: gruppen } = await supabase
    .from("gruppen")
    .select("id, name")
    .eq("einrichtung_id", einrichtungId ?? "")
    .is("archived_at", null)
    .order("sort_order");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">
        {mitglied.vorname} {mitglied.nachname}
      </h1>
      <TeamForm
        mode="edit"
        teamId={mitglied.id}
        defaultValues={{
          vorname: mitglied.vorname ?? "",
          nachname: mitglied.nachname ?? "",
          rolle: mitglied.rolle ?? "",
          gruppe_id: mitglied.gruppe_id ?? "",
          wochenstunden:
            mitglied.wochenstunden !== null ? String(mitglied.wochenstunden) : "",
          fachkraft: mitglied.fachkraft,
          status: mitglied.status as "aktiv" | "inaktiv" | "geplant",
          eintritt: mitglied.eintritt ?? "",
          austritt: mitglied.austritt ?? "",
        }}
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
      />
    </div>
  );
}
