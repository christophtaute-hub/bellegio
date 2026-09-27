"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { archiviereEinrichtung, updateEinrichtungKostenstelleCluster } from "@/lib/actions/einrichtung";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

type EinrichtungZeile = {
  id: string;
  name: string;
  ort: string | null;
  bundeslandLabel: string;
  kostenstelle: string | null;
  cluster: string | null;
};

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
  const [werte, setWerte] = useState<Record<string, { kostenstelle: string; cluster: string }>>(() =>
    Object.fromEntries(
      einrichtungen.map((e) => [e.id, { kostenstelle: e.kostenstelle ?? "", cluster: e.cluster ?? "" }])
    )
  );

  async function speichern(einrichtungId: string) {
    const wert = werte[einrichtungId];
    try {
      await updateEinrichtungKostenstelleCluster(
        einrichtungId,
        wert.kostenstelle.trim() || null,
        wert.cluster.trim() || null
      );
      meldeErfolg("Gespeichert.");
    } catch (err) {
      meldeFehler(err instanceof Error ? err.message : "Fehler beim Speichern.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {einrichtungen.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="font-medium">{e.name}</span>
            <span className="text-muted-foreground">
              {[e.ort, e.bundeslandLabel].filter(Boolean).join(" · ")}
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`kostenstelle-${e.id}`} className="text-xs text-muted-foreground">
                Kostenstelle
              </label>
              <Input
                id={`kostenstelle-${e.id}`}
                value={werte[e.id]?.kostenstelle ?? ""}
                onChange={(event) =>
                  setWerte((v) => ({ ...v, [e.id]: { ...v[e.id], kostenstelle: event.target.value } }))
                }
                onBlur={() => speichern(e.id)}
                className="h-7 w-28"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`cluster-${e.id}`} className="text-xs text-muted-foreground">
                Cluster
              </label>
              <Input
                id={`cluster-${e.id}`}
                value={werte[e.id]?.cluster ?? ""}
                onChange={(event) =>
                  setWerte((v) => ({ ...v, [e.id]: { ...v[e.id], cluster: event.target.value } }))
                }
                onBlur={() => speichern(e.id)}
                className="h-7 w-28"
              />
            </div>
            {e.id === aktiveId ? (
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                Geöffnet
              </span>
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
