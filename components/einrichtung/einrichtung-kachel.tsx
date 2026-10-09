import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { ladeEinrichtungKennzahlen } from "@/lib/dashboard/einrichtung-kennzahlen";
import { canViewFinanzen } from "@/lib/server/current-user-role";
import { plusMinusStatus } from "@/lib/ui/status";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { BundeslandBadge } from "@/components/layout/bundesland-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


async function KachelInhalt({ einrichtungId, stichtag }: { einrichtungId: string; stichtag: string }) {
  const supabase = await createClient();
  const zeigeFinanzen = await canViewFinanzen(supabase, einrichtungId);
  const k = await ladeEinrichtungKennzahlen(supabase, einrichtungId, stichtag, { zeigeFinanzen });
  const geld = k.ergebnisMonat !== null ? { ...plusMinusStatus(k.ergebnisMonat), betrag: k.ergebnisMonat } : null;
  const auslastung = k.sollplaetze > 0 ? Math.min(100, Math.round((k.kinderGesamt / k.sollplaetze) * 100)) : 0;
  const ueberbelegt = k.sollplaetze > 0 && k.kinderGesamt > k.sollplaetze;

  // Frisch angelegte Einrichtung ohne Gruppen: nicht „0 / 0 — voll belegt“, sondern der nächste Schritt
  if (k.sollplaetze === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Gruppen angelegt — öffnen und die ersten Schritte durchgehen.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Belegung</span>
          <span className="font-medium tabular-nums">
            {k.kinderGesamt} / {k.sollplaetze} Plätze
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${auslastung} % belegt`}>
          <div className={`h-full rounded-full ${ueberbelegt ? "bg-destructive" : "bg-primary"}`} style={{ width: `${auslastung}%` }} />
        </div>
        <p className={`text-xs ${ueberbelegt ? "text-destructive" : "text-muted-foreground"}`}>
          {ueberbelegt ? "Überbelegt" : k.freiePlaetze === 0 ? "Voll belegt" : `${k.freiePlaetze} Plätze frei`}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex min-w-0 flex-col">
          <span className="text-muted-foreground">Personal und Gesetz</span>
          <span className="truncate font-medium tabular-nums">{k.personal.gesetz.ist}</span>
          <span className="truncate text-xs text-muted-foreground">{k.personal.gesetz.vorgabe}</span>
        </div>
        <AmpelBadge ampel={k.ampel} />
      </div>
      {geld ? (
        <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground">Förderung minus Personal</span>
            <span className={`truncate font-medium tabular-nums ${geld.ton === "plus" ? "text-emerald-700 dark:text-emerald-400" : geld.ton === "minus" ? "text-destructive" : ""}`}>
              {geld.betrag > 0 ? "+" : ""}
              {geld.betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} im Monat
            </span>
          </div>
          <span
            className={`size-3 shrink-0 rounded-full ${geld.ton === "plus" ? "bg-emerald-500" : geld.ton === "minus" ? "bg-destructive" : "bg-muted-foreground/40"}`}
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}

function KachelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Mini-Dashboard einer Einrichtung: Kopf (Name, Ort, Bundesland) sofort, Kennzahlen gestreamt — bei vielen
 * Einrichtungen steht die Seite damit sofort, und jede Kachel füllt sich, sobald ihre Zahlen da sind. Klick öffnet
 * die Einrichtung (setActiveEinrichtung). */
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
    <form
      action={async () => {
        "use server";
        await setActiveEinrichtung(id);
      }}
      className="h-full"
      data-nav
    >
      <button type="submit" className="block h-full w-full text-left">
        <Card className="h-full cursor-pointer gap-0 py-4 transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col gap-4 px-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-base text-primary">{name}</p>
                {ort ? <p className="truncate text-xs text-muted-foreground">{ort}</p> : null}
              </div>
              <BundeslandBadge code={bundeslandCode} />
            </div>
            <Suspense fallback={<KachelSkeleton />}>
              <KachelInhalt einrichtungId={id} stichtag={stichtag} />
            </Suspense>
          </CardContent>
        </Card>
      </button>
    </form>
  );
}
