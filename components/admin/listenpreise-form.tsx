"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { speichereListenpreise } from "@/lib/actions/admin";
import type { Listenpreise } from "@/lib/preise";

const zahlOderNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function ListenpreiseForm({ initial }: { initial: Listenpreise }) {
  const [grund, setGrund] = useState(initial.grundgebuehr?.toString().replace(".", ",") ?? "");
  const [proKind, setProKind] = useState(initial.proKind?.toString().replace(".", ",") ?? "");
  const [hinweis, setHinweis] = useState(initial.hinweis ?? "");
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
        const ergebnis = await speichereListenpreise({
          grundgebuehr: zahlOderNull(grund),
          proKind: zahlOderNull(proKind),
          hinweis: hinweis.trim() || null,
        });
        setPending(false);
        if (!ergebnis.ok) setError(ergebnis.error);
        else setGespeichert(true);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-grund">Grundgebühr je Einrichtung und Monat (netto, €)</Label>
          <Input id="liste-grund" inputMode="decimal" value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-kind">Preis je Kind und Monat (netto, €)</Label>
          <Input id="liste-kind" inputMode="decimal" value={proKind} onChange={(e) => setProKind(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="liste-hinweis">Zusatzhinweis unter den Preisen (optional, z. B. Vertragslaufzeit)</Label>
          <Input id="liste-hinweis" value={hinweis} maxLength={500} onChange={(e) => setHinweis(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Preise speichern"}
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert — die Landingpage zeigt die neuen Preise.</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
