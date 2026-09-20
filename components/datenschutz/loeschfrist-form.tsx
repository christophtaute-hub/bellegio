"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { speichereLoeschfrist } from "@/lib/actions/datenschutz";

export function LoeschfristForm({ einrichtungId, initial }: { einrichtungId: string; initial: number | null }) {
  const [wert, setWert] = useState(initial === null ? "" : String(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setGespeichert(false);
        const ergebnis = await speichereLoeschfrist(einrichtungId, wert.trim() === "" ? null : Number(wert));
        setPending(false);
        if (!ergebnis.ok) setError(ergebnis.error);
        else setGespeichert(true);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loeschfrist">Löschfrist nach dem Austritt (Monate)</Label>
        <Input id="loeschfrist" inputMode="numeric" value={wert} onChange={(e) => setWert(e.target.value)} className="w-40" placeholder="keine Erinnerung" />
        <p className="max-w-xl text-xs text-muted-foreground">
          Nach dieser Zeit erinnert Bellegio an Einträge, die zur Löschung oder Anonymisierung anstehen. Gelöscht wird nie automatisch. Wie lange Daten
          aufbewahrt werden müssen, hängt von Bundesland, Förderung und Träger ab — bitte mit dem Datenschutzbeauftragten und dem Jugendamt abstimmen.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
