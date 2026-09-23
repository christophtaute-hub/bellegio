import Link from "next/link";
import { redirect } from "next/navigation";
import { zustimmungOffen } from "@/lib/server/zustimmung";
import { Building2, Users, DoorOpen, Shield, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { signOut } from "@/lib/actions/auth";
import { toIsoDateString } from "@/lib/kita-datum";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import { getPersonalplanungFuerEinrichtung } from "@/lib/team/personalplanung";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { getCurrentUserRole, isPlatformOperator } from "@/lib/server/current-user-role";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Lädt die Kacheln-Kennzahlen für mehrere Einrichtungen auf einmal. Die Sollplätze
 * kommen aus einer einzigen Batch-Query statt einer je Einrichtung — Belegung und
 * Personalplanung laufen weiterhin je Einrichtung (eigene RPC/Berechnung je Bundesland),
 * aber alle parallel statt verschachtelt, damit die Seite auch bei vielen Einrichtungen
 * mit einer konstanten Zahl an Roundtrips auskommt. */
async function ladeEinrichtungsKennzahlen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  einrichtungIds: string[],
  stichtag: string
) {
  const [{ data: gruppen }, kinderRowsListe, personalErgebnisListe] = await Promise.all([
    supabase
      .from("gruppen")
      .select("einrichtung_id, sollplatze")
      .in("einrichtung_id", einrichtungIds)
      .is("archived_at", null),
    Promise.all(einrichtungIds.map((id) => getKinderPresenceAtDate(supabase, id, stichtag))),
    Promise.all(einrichtungIds.map((id) => getPersonalplanungFuerEinrichtung(supabase, id, stichtag))),
  ]);

  const sollplaetzeByEinrichtung = new Map<string, number>();
  for (const g of gruppen ?? []) {
    sollplaetzeByEinrichtung.set(
      g.einrichtung_id,
      (sollplaetzeByEinrichtung.get(g.einrichtung_id) ?? 0) + Number(g.sollplatze)
    );
  }

  return einrichtungIds.map((id, i) => {
    const sollplaetzeSumme = sollplaetzeByEinrichtung.get(id) ?? 0;
    const { kinderGesamt } = buildKpis(kinderRowsListe[i]);
    return {
      kinderGesamt,
      freiePlaetze: Math.max(0, sollplaetzeSumme - kinderGesamt),
      ampel: personalErgebnisListe[i].daten.ampel,
    };
  });
}

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
        .select("id, name, address_city")
        .eq("trager_id", profil.trager_id)
        .is("archived_at", null)
        .order("name")
    : { data: [] };

  const kennzahlenListe =
    einrichtungen && einrichtungen.length > 0
      ? await ladeEinrichtungsKennzahlen(supabase, einrichtungen.map((e) => e.id), stichtag)
      : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-8 p-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl text-primary">
          Deine Einrichtungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Wähle die Einrichtung, mit der du arbeiten möchtest.
        </p>
      </div>

      {einrichtungen && einrichtungen.length > 0 ? (
        <div className="flex w-full max-w-2xl flex-col gap-2">
          {einrichtungen.map((einrichtung, i) => {
            const kennzahlen = kennzahlenListe[i];
            return (
              <form
                key={einrichtung.id}
                action={setActiveEinrichtung.bind(null, einrichtung.id)}
              >
                <button type="submit" className="block w-full text-left">
                  <Card className="cursor-pointer gap-0 py-3 transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Building2 className="size-5 shrink-0 text-primary" aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate font-heading text-base text-primary">
                            {einrichtung.name}
                          </p>
                          {einrichtung.address_city ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {einrichtung.address_city}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {kennzahlen ? (
                        <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Users className="size-4" />
                            {kennzahlen.kinderGesamt}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DoorOpen className="size-4" />
                            {kennzahlen.freiePlaetze} frei
                          </span>
                          <AmpelBadge
                            ampel={kennzahlen.ampel}
                            labels={{ gruen: "In Ordnung", gelb: "Knapp", rot: "Handlungsbedarf" }}
                          />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </button>
              </form>
            );
          })}
        </div>
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
    </div>
  );
}
