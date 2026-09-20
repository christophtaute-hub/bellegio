import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { GruppeForm } from "@/components/gruppen/gruppe-form";

export default async function GruppeBearbeitenPage({
  params,
}: {
  params: Promise<{ gruppeId: string }>;
}) {
  const { gruppeId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) notFound();

  const [{ data: gruppe }, { data: einrichtung }] = await Promise.all([
    supabase
      .from("gruppen")
      .select(
        "id, name, gruppenart, sollplatze, einrichtung_id, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden, nrw_gruppenform, nrw_buchungszeit_stunden"
      )
      .eq("id", gruppeId)
      .is("archived_at", null)
      .single(),
    supabase.from("einrichtungen").select("bundesland_code").eq("id", einrichtungId).single(),
  ]);
  if (!gruppe || gruppe.einrichtung_id !== einrichtungId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Gruppe bearbeiten</h1>
      <GruppeForm
        mode="edit"
        gruppeId={gruppe.id}
        bundeslandCode={einrichtung?.bundesland_code ?? "by"}
        initial={{
          name: gruppe.name,
          gruppenart: gruppe.gruppenart,
          sollplatze: Number(gruppe.sollplatze),
          bwBetriebsform: gruppe.bw_betriebsform,
          bwAltersmischung: gruppe.bw_altersmischung ?? false,
          bwOeffnungszeitStunden: gruppe.bw_oeffnungszeit_stunden === null ? null : Number(gruppe.bw_oeffnungszeit_stunden),
          nrwGruppenform: gruppe.nrw_gruppenform,
          nrwBuchungszeitStunden: gruppe.nrw_buchungszeit_stunden === null ? null : Number(gruppe.nrw_buchungszeit_stunden),
        }}
      />
    </div>
  );
}
