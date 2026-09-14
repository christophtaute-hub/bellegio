"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateEmpfohlenerAnstellungsschluessel } from "@/lib/actions/einrichtung";

export function EmpfohlenerSchluesselEditor({
  einrichtungId,
  empfohlenerSchluessel,
  canEdit,
}: {
  einrichtungId: string;
  empfohlenerSchluessel: number;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(empfohlenerSchluessel));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = `Eigene Zielgröße (nicht gesetzlich): 1:${empfohlenerSchluessel}`;

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">{label}</p>;
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {label} (bearbeiten)
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
          await updateEmpfohlenerAnstellungsschluessel(einrichtungId, Number(value));
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="empfohlener_anstellungsschluessel" className="text-xs text-muted-foreground">
          Eigene Zielgröße (1 : X, nicht gesetzlich)
        </label>
        <Input
          id="empfohlener_anstellungsschluessel"
          type="number"
          step="0.1"
          min="0.1"
          max="20"
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
