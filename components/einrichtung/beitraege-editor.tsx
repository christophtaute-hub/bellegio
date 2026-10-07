"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { speichereBeitraege } from "@/lib/actions/beitraege";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

/** Interne Preisliste: Elternbeitrag je Monat und Buchungszeit. Ohne Preisliste bleiben Elternbeiträge aus dem Ergebnis heraus. */
export function BeitraegeEditor({
  einrichtungId,
  baender,
  preise,
  gueltigAb,
  versionen,
  canEdit,
}: {
  einrichtungId: string;
  baender: { id: string; label: string }[];
  /** Beträge der angezeigten Fassung je Band. */
  preise: Record<string, number>;
  gueltigAb: string;
  /** Alle vorhandenen „gültig ab“-Daten (neueste zuerst). */
  versionen: string[];
  canEdit: boolean;
}) {
  const [datum, setDatum] = useState(gueltigAb);
  const [werte, setWerte] = useState<Record<string, string>>(() =>
    Object.fromEntries(baender.map((b) => [b.id, preise[b.id] !== undefined ? String(preise[b.id]) : ""]))
  );
  const [istPending, starte] = useTransition();
  const hatPreise = Object.keys(preise).length > 0;

  function speichern() {
    starte(async () => {
      const r = await speichereBeitraege(
        einrichtungId,
        datum,
        baender.map((b) => ({ bandId: b.id, betrag: werte[b.id]?.trim() ? Number(werte[b.id].replace(",", ".")) : null }))
      );
      if (r.ok) meldeErfolg("Preisliste gespeichert.");
      else meldeFehler(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Elternbeiträge (eure Preisliste)</p>
        <p className="text-xs text-muted-foreground">
          Monatlicher Beitrag je Buchungszeit. Sobald Preise eingetragen sind, fließen die Elternbeiträge ins Ergebnis ein. Leer lassen = kein Preis für dieses Band.
          {hatPreise ? "" : " Aktuell ist keine Preisliste hinterlegt."}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Gültig ab
          <Input type="date" className="h-8 w-40" value={datum} disabled={!canEdit} onChange={(e) => setDatum(e.target.value)} />
        </label>
        {versionen.length > 1 ? (
          <p className="text-xs text-muted-foreground">Vorhandene Fassungen: {versionen.map((v) => new Date(`${v}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" })).join(", ")}</p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {baender.map((b) => (
          <label key={b.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-sm">
            <span>{b.label}</span>
            <span className="flex items-center gap-1">
              <Input
                inputMode="decimal"
                className="h-8 w-24 text-right tabular-nums"
                value={werte[b.id] ?? ""}
                disabled={!canEdit}
                placeholder="–"
                onChange={(e) => setWerte((alt) => ({ ...alt, [b.id]: e.target.value }))}
                aria-label={`Beitrag ${b.label}`}
              />
              <span className="text-xs text-muted-foreground">€</span>
            </span>
          </label>
        ))}
      </div>
      {canEdit ? (
        <Button className="self-start" size="sm" onClick={speichern} disabled={istPending}>
          Preisliste speichern
        </Button>
      ) : null}
    </div>
  );
}
