"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateVollzeitWochenstunden } from "@/lib/actions/einrichtung";

export function VollzeitWochenstundenEditor({
  einrichtungId,
  vollzeitWochenstunden,
  canEdit,
}: {
  einrichtungId: string;
  vollzeitWochenstunden: number;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(vollzeitWochenstunden));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Vollzeit-Referenz: {vollzeitWochenstunden} Std./Woche
      </p>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Vollzeit-Referenz: {vollzeitWochenstunden} Std./Woche (bearbeiten)
      </button>
    );
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
          await updateVollzeitWochenstunden(einrichtungId, Number(value));
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="vollzeit_wochenstunden" className="text-xs text-muted-foreground">
          Vollzeit-Referenz (Std./Woche)
        </label>
        <Input
          id="vollzeit_wochenstunden"
          type="number"
          step="0.5"
          min="1"
          max="48"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 w-28"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "Speichern…" : "Speichern"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(false)}
      >
        Abbrechen
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
