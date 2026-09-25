"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateFoerderungManuell,
  updateLohnnebenkostenProzent,
  updateJahressonderzahlungProzent,
} from "@/lib/actions/einrichtung";

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/** Manueller Fördererlös-Überschreib. Label passt sich an bundeslandCode an: für BW gibt es keine
 * Landesformel, dort ist das Feld faktisch Pflicht; für BY/NRW nur ein optionaler Korrekturwert. */
export function FoerderungManuellEditor({
  einrichtungId,
  bundeslandCode,
  wert,
  canEdit,
}: {
  einrichtungId: string;
  bundeslandCode: string;
  wert: number | null;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(wert !== null ? String(wert) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hinweis =
    bundeslandCode === "bw"
      ? "Baden-Württemberg hat keine Landesformel — hier den mit der Kommune vereinbarten monatlichen Förderbetrag eintragen."
      : "Nur bei Abweichung vom berechneten Wert ausfüllen — überschreibt sonst die Bayern-/NRW-Formel.";

  const anzeige = wert !== null ? formatEuro(wert) + "/Monat" : "nicht gesetzt (Formel wird verwendet)";

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">Manueller Förderbetrag: {anzeige}</p>
        <p className="text-xs text-muted-foreground">{hinweis}</p>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-left text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Manueller Förderbetrag: {anzeige} (bearbeiten)
        </button>
        <p className="text-xs text-muted-foreground">{hinweis}</p>
      </div>
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
          await updateFoerderungManuell(einrichtungId, value ? Number(value) : null);
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="foerderung_monatlich_manuell" className="text-xs text-muted-foreground">
          Manueller Förderbetrag (€/Monat, leer = Formel verwenden)
        </label>
        <Input
          id="foerderung_monatlich_manuell"
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 w-36"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "Speichern…" : "Speichern"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
        Abbrechen
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

export function LohnnebenkostenEditor({
  einrichtungId,
  prozent,
  canEdit,
}: {
  einrichtungId: string;
  prozent: number;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(prozent));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Lohnnebenkosten: {prozent} % (Schätzwert — Sozialversicherung + Zusatzversorgung)
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
        Lohnnebenkosten: {prozent} % (bearbeiten)
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
          await updateLohnnebenkostenProzent(einrichtungId, Number(value));
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="lohnnebenkosten_prozent" className="text-xs text-muted-foreground">
          Lohnnebenkosten (% auf Brutto)
        </label>
        <Input
          id="lohnnebenkosten_prozent"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 w-28"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "Speichern…" : "Speichern"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
        Abbrechen
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

export function JahressonderzahlungEditor({
  einrichtungId,
  prozent,
  canEdit,
}: {
  einrichtungId: string;
  prozent: number;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(prozent));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Jahressonderzahlung: {prozent} % (Schätzwert, gleichmäßig auf 12 Monate verteilt)
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
        Jahressonderzahlung: {prozent} % (bearbeiten)
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
          await updateJahressonderzahlungProzent(einrichtungId, Number(value));
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="jahressonderzahlung_prozent" className="text-xs text-muted-foreground">
          Jahressonderzahlung (% eines Monatsgehalts)
        </label>
        <Input
          id="jahressonderzahlung_prozent"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 w-28"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "Speichern…" : "Speichern"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
        Abbrechen
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
