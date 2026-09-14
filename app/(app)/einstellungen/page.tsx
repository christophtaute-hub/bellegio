import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { VollzeitWochenstundenEditor } from "@/components/team/vollzeit-wochenstunden-editor";
import { EmpfohlenerSchluesselEditor } from "@/components/team/empfohlener-schluessel-editor";

export default async function EinstellungenPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const canEdit = role === "traeger_admin";

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("vollzeit_wochenstunden, empfohlener_anstellungsschluessel")
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">
        Einstellungen
      </h1>

      {einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">
            Personalbemessung (Bayern)
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Diese Werte fließen in die Anstellungsschlüssel-Berechnung auf
            Dashboard, Team, Controlling und Szenario-Rechner ein.
          </p>
          <div className="flex flex-col gap-3">
            <VollzeitWochenstundenEditor
              einrichtungId={einrichtungId}
              vollzeitWochenstunden={Number(einrichtung.vollzeit_wochenstunden)}
              canEdit={canEdit}
            />
            <EmpfohlenerSchluesselEditor
              einrichtungId={einrichtungId}
              empfohlenerSchluessel={Number(
                einrichtung.empfohlener_anstellungsschluessel
              )}
              canEdit={canEdit}
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Einrichtung ausgewählt.
        </p>
      )}
    </div>
  );
}
