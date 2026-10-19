import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getCurrentUserRole, isPlatformOperator } from "@/lib/server/current-user-role";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { EinrichtungenVerwalten } from "@/components/einrichtung/einrichtungen-verwalten";

/** Reiter „Einrichtungen“: Kostenstelle und Cluster pflegen, nicht mehr genutzte Einrichtungen archivieren — nur für Träger-Admin
 * und Betreiber. Gezeigt werden die Einrichtungen des eigenen Trägers; geändert wird weiterhin über die Rechte der Datenbank
 * (nur Träger-Admin des Trägers darf ändern). */
export default async function EinrichtungenEinstellungenPage() {
  const darf = (await getCurrentUserRole()) === "traeger_admin" || (await isPlatformOperator());
  if (!darf) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user ? await supabase.from("user_profiles").select("trager_id").eq("id", user.id).single() : { data: null };
  if (!profil) notFound();

  const [{ data: einrichtungen }, aktiveId] = await Promise.all([
    supabase
      .from("einrichtungen")
      .select("id, name, address_city, bundesland_code, kostenstelle, cluster")
      .eq("trager_id", profil.trager_id)
      .is("archived_at", null)
      .order("name"),
    getActiveEinrichtungId(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Einrichtungen</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Kostenstelle und Cluster pflegen oder nicht mehr genutzte Einrichtungen archivieren. Archivierte Einrichtungen verschwinden
          aus der Auswahl, ihre Daten bleiben erhalten.
        </p>
      </div>
      {einrichtungen && einrichtungen.length > 0 ? (
        <div className="max-w-3xl">
          <EinrichtungenVerwalten
            aktiveId={aktiveId ?? ""}
            einrichtungen={einrichtungen.map((e) => ({
              id: e.id,
              name: e.name,
              ort: e.address_city,
              bundeslandLabel: BUNDESLAENDER.find((b) => b.code === e.bundesland_code)?.label ?? e.bundesland_code,
              kostenstelle: e.kostenstelle,
              cluster: e.cluster,
            }))}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">In deinem Träger ist noch keine Einrichtung angelegt.</p>
      )}
    </div>
  );
}
