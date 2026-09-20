"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { archiviereEinrichtung } from "@/lib/actions/einrichtung";

type EinrichtungZeile = { id: string; name: string; ort: string | null; bundeslandLabel: string };

export function EinrichtungenVerwalten({
  einrichtungen,
  aktiveId,
}: {
  einrichtungen: EinrichtungZeile[];
  aktiveId: string;
}) {
  const router = useRouter();
  const [bestaetige, setBestaetige] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {einrichtungen.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="font-medium">{e.name}</span>
            <span className="text-muted-foreground">
              {[e.ort, e.bundeslandLabel].filter(Boolean).join(" · ")}
            </span>
            {e.id === aktiveId ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Geöffnet</span>
            ) : bestaetige === e.id ? (
              <span className="ml-auto flex items-center gap-2">
                Wirklich archivieren?
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={async () => {
                    setPending(true);
                    setError(null);
                    const ergebnis = await archiviereEinrichtung(e.id);
                    setPending(false);
                    setBestaetige(null);
                    if (!ergebnis.ok) setError(ergebnis.error);
                    else router.refresh();
                  }}
                >
                  Ja
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBestaetige(null)}>
                  Nein
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setBestaetige(e.id)}>
                Archivieren
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Link href="/einrichtung-auswahl/neu" className={buttonVariants({ size: "sm", className: "w-fit" })}>
        <Plus className="size-3.5" />
        Neue Einrichtung anlegen
      </Link>
    </div>
  );
}
