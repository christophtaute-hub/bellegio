import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { GruppeForm } from "@/components/gruppen/gruppe-form";

export default async function GruppeNeuPage() {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  if (!(await canWriteBelegung(supabase, einrichtungId))) notFound();

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code")
    .eq("id", einrichtungId)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-primary">Gruppe anlegen</h1>
      <GruppeForm mode="create" bundeslandCode={einrichtung?.bundesland_code ?? "by"} />
    </div>
  );
}
