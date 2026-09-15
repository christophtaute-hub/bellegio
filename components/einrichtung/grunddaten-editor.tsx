"use client";

import { useState } from "react";
import {
  updateEinrichtungGrunddaten,
  type EinrichtungGrunddatenInput,
} from "@/lib/actions/einrichtung";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BUNDESLAND_LABEL: Record<string, string> = {
  by: "Bayern",
  bw: "Baden-Württemberg",
  nrw: "Nordrhein-Westfalen",
};

export function GrunddatenEditor({
  einrichtungId,
  grunddaten,
  bundeslandCode,
  canEdit,
}: {
  einrichtungId: string;
  grunddaten: EinrichtungGrunddatenInput;
  bundeslandCode: string;
  canEdit: boolean;
}) {
  const [values, setValues] = useState(grunddaten);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const bundeslandLabel = BUNDESLAND_LABEL[bundeslandCode] ?? bundeslandCode;

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>{grunddaten.name}</p>
        <p>
          {[grunddaten.address_street, grunddaten.address_zip, grunddaten.address_city]
            .filter(Boolean)
            .join(", ") || "Keine Adresse hinterlegt"}
        </p>
        <p>Bundesland: {bundeslandLabel}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        setGespeichert(false);
        try {
          await updateEinrichtungGrunddaten(einrichtungId, values);
          setGespeichert(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="einrichtung-name">Name</Label>
          <Input
            id="einrichtung-name"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kita-jahr-start">Kitajahr-Start-Monat (1–12)</Label>
          <Input
            id="kita-jahr-start"
            type="number"
            min={1}
            max={12}
            value={values.kita_year_start_month}
            onChange={(event) =>
              setValues({
                ...values,
                kita_year_start_month: Number(event.target.value),
              })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="einrichtung-strasse">Straße</Label>
          <Input
            id="einrichtung-strasse"
            value={values.address_street ?? ""}
            onChange={(event) =>
              setValues({ ...values, address_street: event.target.value || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="einrichtung-plz">PLZ</Label>
          <Input
            id="einrichtung-plz"
            value={values.address_zip ?? ""}
            onChange={(event) =>
              setValues({ ...values, address_zip: event.target.value || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="einrichtung-stadt">Stadt</Label>
          <Input
            id="einrichtung-stadt"
            value={values.address_city ?? ""}
            onChange={(event) =>
              setValues({ ...values, address_city: event.target.value || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Bundesland</Label>
          <p className="flex h-8 items-center text-sm text-muted-foreground">
            {bundeslandLabel} — nur per Datenbank änderbar
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isSaving} className="self-start">
          {isSaving ? "Speichern…" : "Speichern"}
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
