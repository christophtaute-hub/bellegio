"use client";

import { Info } from "lucide-react";
import { krippenUebergangWarnung } from "@/lib/kita-datum";

/** Rein informativer Hinweis (keine Sperre): ein Krippe-Kind verlässt mit 3 Jahren in der Regel die Krippe —
 * kann aber bis zum Ende des Kitajahres verlängern oder einen neuen Kindergarten-Vertrag bekommen. */
export function KrippenUebergangHinweis({ geburtsdatum }: { geburtsdatum: string }) {
  if (!geburtsdatum || krippenUebergangWarnung(geburtsdatum) !== "rot") return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-secondary/30 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-primary">Wird 3 — Krippe/Kindergarten prüfen</h3>
        <p className="text-xs text-muted-foreground">
          Dieses Kind ist bereits 3 oder wird es bald und verlässt damit in der Regel die Krippe. Optionen:
          Verlängerung bis zum Ende des Kitajahres, oder ein neuer Kindergarten-Vertrag.
        </p>
      </div>
    </div>
  );
}
