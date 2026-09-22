"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { legeEinrichtungAn, setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export function NeueEinrichtungForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const text = (name: string) => String(form.get(name) ?? "").trim();
        setPending(true);
        setError(null);
        const ergebnis = await legeEinrichtungAn({
          name: text("name"),
          bundeslandCode: text("bundeslandCode"),
          ort: text("ort") || null,
          vollzeitWochenstunden: Number(text("vollzeit").replace(",", ".")),
          kostenstelle: text("kostenstelle") || null,
          cluster: text("cluster") || null,
        });
        if (!ergebnis.ok) {
          setPending(false);
          setError(ergebnis.error);
          return;
        }
        // Direkt in die neue Einrichtung wechseln — dort geht es mit den Gruppen weiter.
        await setActiveEinrichtung(ergebnis.id);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name der Einrichtung</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bundeslandCode">Bundesland</Label>
        <select id="bundeslandCode" name="bundeslandCode" className={SELECT_CLASS} required defaultValue="">
          <option value="" disabled>
            Bitte wählen
          </option>
          {BUNDESLAENDER.map((b) => (
            <option key={b.code} value={b.code}>
              {b.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Bestimmt den Rechenweg für Personal und Belegung und lässt sich später nicht mehr ändern.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ort">Ort</Label>
        <Input id="ort" name="ort" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vollzeit">Vollzeit-Wochenstunden (Referenz für VZÄ)</Label>
        <Input id="vollzeit" name="vollzeit" inputMode="decimal" defaultValue="39" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kostenstelle">Kostenstelle (optional)</Label>
        <Input id="kostenstelle" name="kostenstelle" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cluster">Cluster (optional)</Label>
        <Input id="cluster" name="cluster" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird angelegt…" : "Einrichtung anlegen"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/einrichtung-auswahl")}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
