"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type FilterFeld = { name: string; label: string; optionen: { wert: string; label: string }[]; text?: boolean };

/** Filterleiste: jede Auswahl setzt sofort den URL-Parameter (ein Klick, kein „Anzeigen“); „Zurücksetzen“ löscht alle. */
export function FilterLeiste({ felder }: { felder: FilterFeld[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const gesetzt = felder.some((f) => params.get(f.name));
  const [zuruecksetzer, setZuruecksetzer] = useState(0);

  function setze(name: string, wert: string) {
    const neu = new URLSearchParams(params.toString());
    if (wert) neu.set(name, wert);
    else neu.delete(name);
    router.replace(`${pathname}${neu.size ? `?${neu}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {felder.map((f) =>
        f.text ? (
          <TextFilter key={`${f.name}-${zuruecksetzer}`} feld={f} wert={params.get(f.name) ?? ""} onChange={(v) => setze(f.name, v)} />
        ) : (
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
        )
      )}
      {gesetzt ? (
        <Button variant="ghost" size="sm" onClick={() => {
            setZuruecksetzer((n) => n + 1);
            router.replace(pathname, { scroll: false });
          }} className="gap-1">
          <X className="size-3.5" aria-hidden />
          Zurücksetzen
        </Button>
      ) : null}
    </div>
  );
}

/** Suchfeld: setzt den Parameter erst nach kurzer Pause beim Tippen. */
function TextFilter({ feld, wert, onChange }: { feld: FilterFeld; wert: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(wert);
  useEffect(() => {
    if (text === wert) return;
    const t = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {feld.label}
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, Kostenstelle, Ort" className="h-9 w-56 text-foreground" />
    </label>
  );
}
