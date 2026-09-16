import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWritePersonal } from "@/lib/server/current-user-role";
import { TeamForm } from "@/components/team/team-form";
import { AusfallzeitenListe } from "@/components/team/ausfallzeiten-liste";
import {
  Aenderungshistorie,
  type AenderungsEintrag,
} from "@/components/kinder/aenderungshistorie";

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
      "id, einrichtung_id, vorname, nachname, rolle, gruppe_id, wochenstunden, role_category, status, eintritt, austritt"
    )
    .eq("id", teamId)
    .single();

  if (!mitglied || mitglied.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const [{ data: gruppen }, { data: ausfallzeiten }, canEditPersonal, { data: auditLog }] =
    await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name")
        .eq("einrichtung_id", einrichtungId ?? "")
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("team_ausfallzeiten")
        .select("id, art, von, bis, notizen")
        .eq("team_id", teamId)
        .order("von", { ascending: false }),
      einrichtungId ? canWritePersonal(supabase, einrichtungId) : false,
      supabase
        .from("team_audit_log")
        .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
        .eq("team_id", teamId)
        .order("changed_at", { ascending: false }),
    ]);

  const aenderungen: AenderungsEintrag[] = (auditLog ?? []).map((entry) => ({
    id: entry.id,
    changed_at: entry.changed_at,
    changed_by_name: entry.user_profiles?.full_name ?? null,
    old_data: entry.old_data as Record<string, unknown> | null,
    new_data: entry.new_data as Record<string, unknown>,
  }));

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
          role_category: mitglied.role_category as
            | "fk"
            | "ek"
            | "ak"
            | "nicht_paed"
            | "sprachfoerderung"
            | "hausmeister"
            | "hauswirtschaft",
          status: mitglied.status as "aktiv" | "inaktiv" | "geplant",
          eintritt: mitglied.eintritt ?? "",
          austritt: mitglied.austritt ?? "",
        }}
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
      />
      <AusfallzeitenListe
        teamId={mitglied.id}
        ausfallzeiten={ausfallzeiten ?? []}
        canEdit={canEditPersonal}
      />
      <Aenderungshistorie eintraege={aenderungen} />
    </div>
  );
}
