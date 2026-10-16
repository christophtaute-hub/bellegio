"use client";

import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Der Hauptknopf jedes Rechners: Annahmen eingeben, dann bewusst „Jetzt berechnen“. Ändern sich die Annahmen nach dem
 * Berechnen, weist die Leiste darauf hin — das Ergebnis darunter bleibt bis zum nächsten Klick unverändert. */
export function BerechnenLeiste({ berechnet, veraltet, onBerechnen }: { berechnet: boolean; veraltet: boolean; onBerechnen: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="lg" onClick={onBerechnen} className="gap-2">
        <Calculator className="size-4" aria-hidden />
        Jetzt berechnen
      </Button>
      {veraltet ? (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Annahmen geändert — das Ergebnis unten gehört noch zu den alten Werten. Bitte neu berechnen.</p>
      ) : !berechnet ? (
        <p className="text-sm text-muted-foreground">Gib deine Annahmen ein und drücke „Jetzt berechnen“.</p>
      ) : null}
    </div>
  );
}
