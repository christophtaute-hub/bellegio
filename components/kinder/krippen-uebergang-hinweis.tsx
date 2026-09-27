"use client";

import { Info } from "lucide-react";
import { krippenUebergangWarnung } from "@/lib/kita-datum";
import type { GruppeFuerPassung } from "@/lib/kinder/gruppen-passung";

/** Rein informativer Hinweis (keine Sperre): ein Krippe-Kind verlässt mit 3 Jahren in der Regel die Krippe —
 * kann aber bis zum Ende des Kitajahres verlängern oder einen neuen Kindergarten-Vertrag bekommen. Nennt
 * konkret, ob in einer Kindergarten-Gruppe derselben Einrichtung aktuell ein Platz frei ist (reine
 * Wiederverwendung von gruppenMitKindern, das die Gruppen-Passungs-Einschätzung ohnehin schon lädt). */
export function KrippenUebergangHinweis({
  geburtsdatum,
  gruppenMitKindern,
}: {
  geburtsdatum: string;
  gruppenMitKindern: GruppeFuerPassung[];
}) {
  if (!geburtsdatum || krippenUebergangWarnung(geburtsdatum) !== "rot") return null;

  const kindergartenGruppenMitPlatz = gruppenMitKindern
    .filter((g) => g.gruppenart === "kindergarten")
    .map((g) => ({ name: g.name, frei: g.sollplatze - g.aktiveKinder.length }))
    .filter((g) => g.frei > 0);

  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-secondary/30 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-primary">Wird 3 — Krippe/Kindergarten prüfen</h3>
        <p className="text-xs text-muted-foreground">
          Dieses Kind ist bereits 3 oder wird es bald und verlässt damit in der Regel die Krippe.{" "}
          {kindergartenGruppenMitPlatz.length > 0 ? (
            <>
              Ein Platz ist frei in:{" "}
              {kindergartenGruppenMitPlatz.map((g) => `${g.name} (${g.frei})`).join(", ")}.
            </>
          ) : (
            "Aktuell ist kein Kindergarten-Platz frei — als Option bleibt die Verlängerung bis zum Ende des Kitajahres."
          )}
        </p>
      </div>
    </div>
  );
}
