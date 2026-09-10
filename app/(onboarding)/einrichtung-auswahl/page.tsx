import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { signOut } from "@/lib/actions/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function EinrichtungAuswahlPage() {
  const supabase = await createClient();
  const { data: einrichtungen } = await supabase
    .from("einrichtungen")
    .select("id, name, address_city")
    .is("archived_at", null)
    .order("name");

  return (
    <div className="flex flex-1 flex-col items-center gap-8 p-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl text-primary">
          Einrichtung wählen
        </h1>
        <p className="text-sm text-muted-foreground">
          Wähle die Einrichtung, mit der du arbeiten möchtest.
        </p>
      </div>

      {einrichtungen && einrichtungen.length > 0 ? (
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {einrichtungen.map((einrichtung) => (
            <form
              key={einrichtung.id}
              action={setActiveEinrichtung.bind(null, einrichtung.id)}
            >
              <button type="submit" className="block w-full text-left">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
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
                  </CardHeader>
                </Card>
              </button>
            </form>
          ))}
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
