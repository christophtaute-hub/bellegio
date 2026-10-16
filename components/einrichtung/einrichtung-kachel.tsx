import { Suspense } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { KitaAmpelBlock } from "@/components/steuerung/kita-ampel-block";
import { BundeslandBadge } from "@/components/layout/bundesland-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function KachelSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2" aria-hidden>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** Eine Einrichtung in „Meine Einrichtungen“: Kopf (Name, Ort, Bundesland, „Öffnen“) sofort, die zwei Ampeln (Belegung, Personal)
 * gestreamt — bei vielen Einrichtungen steht die Seite damit sofort, und jede Karte füllt sich, sobald ihre Zahlen da sind.
 * „Öffnen“ öffnet die Einrichtung (setActiveEinrichtung); ein Klick auf eine Ampel öffnet stattdessen die Maßnahmen. */
export function EinrichtungKachel({
  id,
  name,
  ort,
  bundeslandCode,
  stichtag,
}: {
  id: string;
  name: string;
  ort: string | null;
  bundeslandCode: string;
  stichtag: string;
}) {
  return (
    <Card className="h-full gap-0 py-4 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 px-4">
        <form
          action={async () => {
            "use server";
            await setActiveEinrichtung(id);
          }}
          data-nav
        >
          <button type="submit" className="group flex w-full items-start gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-secondary/60">
            <Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-base text-primary">{name}</span>
              {ort ? <span className="block truncate text-xs text-muted-foreground">{ort}</span> : null}
            </span>
            <BundeslandBadge code={bundeslandCode} />
            <span className="flex shrink-0 items-center text-xs font-medium text-primary group-hover:underline">
              Öffnen
              <ArrowRight className="ml-1 size-3.5" aria-hidden />
            </span>
          </button>
        </form>
        <Suspense fallback={<KachelSkeleton />}>
          <KitaAmpelBlock einrichtungId={id} einrichtungName={name} stichtag={stichtag} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
