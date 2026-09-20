"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loescheAlteAnfragen } from "@/lib/actions/admin";

export function AlteAnfragenLoeschen({ monate }: { monate: number }) {
  const [pending, setPending] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMeldung(null);
          const ergebnis = await loescheAlteAnfragen();
          setPending(false);
          setMeldung(ergebnis.ok ? `${ergebnis.geloescht} Anfragen gelöscht.` : ergebnis.error);
        }}
      >
        Anfragen älter als {monate} Monate löschen
      </Button>
      {meldung ? <span className="text-xs text-muted-foreground">{meldung}</span> : null}
    </div>
  );
}
