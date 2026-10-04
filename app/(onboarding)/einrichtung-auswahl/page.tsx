import Link from "next/link";
import { redirect } from "next/navigation";
import { zustimmungOffen } from "@/lib/server/zustimmung";
import { Shield, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { toIsoDateString } from "@/lib/kita-datum";
import { getCurrentUserRole, isPlatformOperator } from "@/lib/server/current-user-role";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { EinrichtungenVerwalten } from "@/components/einrichtung/einrichtungen-verwalten";
import { EinrichtungKachel } from "@/components/einrichtung/einrichtung-kachel";
import { EinrichtungenUebersicht } from "@/components/einrichtung/einrichtungen-uebersicht";
import { Button } from "@/components/ui/button";

export default async function EinrichtungAuswahlPage() {
  if (await zustimmungOffen()) redirect("/zustimmung");
  const supabase = await createClient();
  const stichtag = toIsoDateString(new Date());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("user_profiles").select("trager_id").eq("id", user.id).single()
    : { data: null };
  const istBetreiber = await isPlatformOperator();
  const istTraegerAdmin = (await getCurrentUserRole()) === "traeger_admin";

  // Der Betreiber darf per RLS alle Einrichtungen sehen — hier zeigen wir trotzdem
  // nur die des eigenen Trägers, alles andere gehört in die Betreiber-Zentrale.
  const { data: einrichtungen } = profil
    ? await supabase
        .from("einrichtungen")
        .select("id, name, address_city, bundesland_code, kostenstelle, cluster")
        .eq("trager_id", profil.trager_id)
        .is("archived_at", null)
        .order("name")
    : { data: [] };

  // Wer nur eine einzige Einrichtung sieht (und sie nicht verwaltet), braucht keine Auswahl: direkt öffnen.
  if (!istTraegerAdmin && einrichtungen?.length === 1) {
    redirect(`/einrichtung-auswahl/oeffnen?id=${einrichtungen[0].id}`);
  }

  const aktiveEinrichtungId = istTraegerAdmin ? await getActiveEinrichtungId() : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 p-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl text-primary">Meine Einrichtungen</h1>
        <p className="text-sm text-muted-foreground">Wähle die Einrichtung, mit der du arbeiten möchtest.</p>
      </div>

      {einrichtungen && einrichtungen.length > 0 ? (
        <EinrichtungenUebersicht
          eintraege={einrichtungen.map((e) => ({
            id: e.id,
            name: e.name,
            ort: e.address_city,
            bundesland_code: e.bundesland_code,
            kachel: (
              <EinrichtungKachel
                id={e.id}
                name={e.name}
                ort={e.address_city}
                bundeslandCode={e.bundesland_code}
                stichtag={stichtag}
              />
            ),
          }))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {istTraegerAdmin
            ? "In deinem Träger ist noch keine Einrichtung angelegt."
            : "Dir ist noch keine Einrichtung zugeordnet. Bitte wende dich an deinen Träger-Administrator."}
        </p>
      )}

      <div className="flex items-center gap-2">
        {istTraegerAdmin ? (
          <Button nativeButton={false} render={<Link href="/einrichtung-auswahl/neu" />} variant="outline" size="sm">
            <Plus className="size-3.5" />
            Neue Einrichtung
          </Button>
        ) : null}
        {istBetreiber ? (
          <Button nativeButton={false} render={<Link href="/admin" />} variant="outline" size="sm">
            <Shield className="size-3.5" />
            Betreiber-Zentrale
          </Button>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Abmelden
          </Button>
        </form>
      </div>

      {istTraegerAdmin && einrichtungen && einrichtungen.length > 0 ? (
        <div className="flex w-full max-w-2xl flex-col gap-3 border-t pt-8">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-base text-primary">Verwaltung</h2>
            <p className="text-xs text-muted-foreground">
              Kostenstelle/Cluster pflegen oder nicht mehr genutzte Einrichtungen archivieren. Archivierte
              Einrichtungen verschwinden aus der Auswahl, ihre Daten bleiben erhalten.
            </p>
          </div>
          <EinrichtungenVerwalten
            aktiveId={aktiveEinrichtungId ?? ""}
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
      ) : null}
    </div>
  );
}
