"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilterFeld = { name: string; label: string; optionen: { wert: string; label: string }[] };

/** Filterleiste: jede Auswahl setzt sofort den URL-Parameter (ein Klick, kein „Anzeigen“); „Zurücksetzen“ löscht alle. */
export function FilterLeiste({ felder }: { felder: FilterFeld[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const gesetzt = felder.some((f) => params.get(f.name));

  function setze(name: string, wert: string) {
    const neu = new URLSearchParams(params.toString());
    if (wert) neu.set(name, wert);
    else neu.delete(name);
    router.replace(`${pathname}${neu.size ? `?${neu}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {felder.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {f.label}
          <select
            className="h-9 min-w-36 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
            value={params.get(f.name) ?? ""}
            onChange={(e) => setze(f.name, e.target.value)}
          >
            <option value="">Alle</option>
            {f.optionen.map((o) => (
              <option key={o.wert} value={o.wert}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {gesetzt ? (
        <Button variant="ghost" size="sm" onClick={() => router.replace(pathname, { scroll: false })} className="gap-1">
          <X className="size-3.5" aria-hidden />
          Zurücksetzen
        </Button>
      ) : null}
    </div>
  );
}
