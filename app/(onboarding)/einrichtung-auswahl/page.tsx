import { Building2, Users, DoorOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { signOut } from "@/lib/actions/auth";
import { toIsoDateString } from "@/lib/kita-datum";
import { getKinderPresenceAtDate, buildKpis } from "@/lib/dashboard/presence";
import { getPersonalplanungFuerEinrichtung } from "@/lib/team/personalplanung";
import { AmpelBadge } from "@/components/team/ampel-badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function ladeEinrichtungsKennzahlen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  einrichtungId: string,
  stichtag: string
) {
  const [{ data: gruppen }, kinderRows, personalErgebnis] = await Promise.all([
    supabase
      .from("gruppen")
      .select("sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null),
    getKinderPresenceAtDate(supabase, einrichtungId, stichtag),
    getPersonalplanungFuerEinrichtung(supabase, einrichtungId, stichtag),
  ]);

  const sollplaetzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );
  const { kinderGesamt } = buildKpis(kinderRows);

  return {
    kinderGesamt,
    freiePlaetze: Math.max(0, sollplaetzeSumme - kinderGesamt),
    ampel: personalErgebnis.daten.ampel,
  };
}

export default async function EinrichtungAuswahlPage() {
  const supabase = await createClient();
  const stichtag = toIsoDateString(new Date());
  const { data: einrichtungen } = await supabase
    .from("einrichtungen")
    .select("id, name, address_city")
    .is("archived_at", null)
    .order("name");

  const kennzahlenListe = einrichtungen
    ? await Promise.all(
        einrichtungen.map((e) => ladeEinrichtungsKennzahlen(supabase, e.id, stichtag))
      )
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
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {einrichtungen.map((einrichtung, i) => {
            const kennzahlen = kennzahlenListe[i];
            return (
              <form
                key={einrichtung.id}
                action={setActiveEinrichtung.bind(null, einrichtung.id)}
              >
                <button type="submit" className="block w-full text-left">
                  <Card className="cursor-pointer gap-3 transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <Building2
                            className="mb-1 size-5 text-primary"
                            aria-hidden
                          />
                          <CardTitle>{einrichtung.name}</CardTitle>
                          {einrichtung.address_city ? (
                            <CardDescription>
                              {einrichtung.address_city}
                            </CardDescription>
                          ) : null}
                        </div>
                        {kennzahlen ? (
                          <AmpelBadge ampel={kennzahlen.ampel} labels={{ gruen: "In Ordnung", gelb: "Knapp", rot: "Handlungsbedarf" }} />
                        ) : null}
                      </div>
                    </CardHeader>
                    {kennzahlen ? (
                      <div className="flex gap-4 px-6 pb-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="size-4" />
                          {kennzahlen.kinderGesamt}{" "}
                          {kennzahlen.kinderGesamt === 1 ? "Kind" : "Kinder"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <DoorOpen className="size-4" />
                          {kennzahlen.freiePlaetze} freie Plätze
                        </span>
                      </div>
                    ) : null}
                  </Card>
                </button>
              </form>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Dir ist noch keine Einrichtung zugeordnet. Bitte wende dich an
          deinen Träger-Administrator.
        </p>
      )}

      <form action={signOut}>
        <Button type="submit" variant="secondary" size="sm">
          Abmelden
        </Button>
      </form>
    </div>
  );
}
