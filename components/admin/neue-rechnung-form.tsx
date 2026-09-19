"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { erstelleRechnungsEntwurf } from "@/lib/actions/admin";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export function NeueRechnungForm({
  traeger,
  defaultMonat,
}: {
  traeger: { id: string; name: string }[];
  defaultMonat: string;
}) {
  const [tragerId, setTragerId] = useState(traeger[0]?.id ?? "");
  const [monat, setMonat] = useState(defaultMonat);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        try {
          await erstelleRechnungsEntwurf(tragerId, monat);
        } catch (err) {
          if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
          else if (!(err instanceof Error)) throw err;
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trager">Kunde (Träger)</Label>
        <select id="trager" className={SELECT_CLASS} value={tragerId} onChange={(e) => setTragerId(e.target.value)}>
          {traeger.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="monat">Leistungsmonat</Label>
        <Input id="monat" type="month" value={monat} onChange={(e) => setMonat(e.target.value)} required />
      </div>
      <p className="text-xs text-muted-foreground">
        Sind für den Kunden Preise hinterlegt (Kunden &amp; Preise), entsteht ein Vorschlag je Einrichtung aus
        Grundgebühr und Kinderzahl am Monatsersten. Sonst erfasst du die Positionen von Hand. Jede Position bleibt
        bis zur Freigabe änderbar.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !tragerId} className="self-start">
        {pending ? "Wird angelegt…" : "Entwurf anlegen"}
      </Button>
    </form>
  );
}
