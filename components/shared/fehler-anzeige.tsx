"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Gemeinsame Anzeige für Laufzeitfehler (error.tsx). Zeigt bewusst keine
 * technischen Details — nur die Fehlernummer (digest), mit der sich der Fall
 * in den Server-Logs wiederfinden lässt. */
export function FehlerAnzeige({
  error,
  retry,
  zurueckHref,
  zurueckLabel,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  zurueckHref: string;
  zurueckLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-heading text-2xl text-primary">Da ist etwas schiefgelaufen</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Die Seite konnte nicht geladen werden. Deine Daten sind nicht betroffen. Versuche es bitte
        noch einmal — hilft das nicht, melde dich mit der Fehlernummer beim Support.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Fehlernummer: {error.digest}</p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button onClick={() => retry()}>Erneut versuchen</Button>
        <Link
          href={zurueckHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {zurueckLabel}
        </Link>
      </div>
    </div>
  );
}
