"use client";

import { useState, useTransition } from "react";
import { setzeMonatsstunden } from "@/lib/actions/team";
import { cn } from "cn";

function formatStunden(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export function MonatsstundenZelle({
  teamId,
  month,
  wochenstunden,
  hatEigenenWert,
  hatVollmonatigeAusfallzeit,
  canEdit,
}: {
  teamId: string;
  month: string;
  wochenstunden: number | null;
  hatEigenenWert: boolean;
  hatVollmonatigeAusfallzeit: boolean;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(wochenstunden !== null ? String(wochenstunden) : "");
  const [isPending, startTransition] = useTransition();

  if (wochenstunden === null) {
    return <span className="text-muted-foreground">–</span>;
  }

  if (hatVollmonatigeAusfallzeit) {
    return (
      <span className="text-muted-foreground" title="Ausfallzeit überdeckt den ganzen Monat — Wochenstunden dadurch 0, unabhängig von einem hier gesetzten Wert.">
        0,0
      </span>
    );
  }

  if (!canEdit) {
    return <span className={cn(hatEigenenWert && "font-medium")}>{formatStunden(wochenstunden)}</span>;
  }

  return (
    <input
      type="number"
      step="0.5"
      min="0"
      className={cn(
        "h-7 w-16 rounded-md border border-input bg-transparent px-1.5 text-sm tabular-nums dark:bg-input/30",
        hatEigenenWert && "font-medium",
        isPending && "opacity-50"
      )}
      value={value}
      disabled={isPending}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const naechster = value.trim() === "" ? null : Number(value.replace(",", "."));
        if (naechster !== null && Number.isNaN(naechster)) {
          setValue(String(wochenstunden));
          return;
        }
        if (naechster === wochenstunden) return;
        startTransition(async () => {
          await setzeMonatsstunden(teamId, month, naechster);
        });
      }}
    />
  );
}
