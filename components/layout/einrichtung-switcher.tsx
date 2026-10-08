"use client";

import { useMemo, useState, useTransition } from "react";
import { endeNavigation, startNavigation } from "@/components/layout/navigations-fortschritt";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Check, Search } from "lucide-react";
import { setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { filtereEinrichtungen, gruppiereNachBundesland } from "@/lib/einrichtung/bundesland-gruppen";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

export type SwitcherEinrichtung = { id: string; name: string; ort: string | null; bundesland_code: string };

/** Schnellwechsler im Header: Einrichtungen nach Bundesland gruppiert, mit Suche und Bundesland-Filter, Wechsel ohne
 * Umweg über die Übersicht — und im selben Bereich bleiben (z.B. Kinderliste → Kinderliste der anderen Einrichtung). */
export function EinrichtungSwitcher({
  einrichtungen,
  aktiveId,
}: {
  einrichtungen: SwitcherEinrichtung[];
  aktiveId: string | null;
}) {
  const pathname = usePathname();
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");
  const [bundesland, setBundesland] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const alleGruppen = useMemo(() => gruppiereNachBundesland(einrichtungen), [einrichtungen]);
  const sichtbar = useMemo(() => filtereEinrichtungen(einrichtungen, suche, bundesland), [einrichtungen, suche, bundesland]);
  const gruppen = useMemo(() => gruppiereNachBundesland(sichtbar), [sichtbar]);

  function wechseln(id: string) {
    if (id === aktiveId) {
      setOffen(false);
      return;
    }
    startNavigation();
    startTransition(async () => {
      try {
        await setActiveEinrichtung(id, pathname);
      } finally {
        endeNavigation();
      }
    });
  }

  const chip = (aktiv: boolean) =>
    cn(
      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
      aktiv ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "gap-1 text-muted-foreground")}
        aria-label="Einrichtung wechseln"
      >
        <ArrowLeftRight className="size-3.5" />
        Wechseln
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex flex-col gap-2 border-b p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sichtbar.length > 0) wechseln(gruppen[0].einrichtungen[0].id);
              }}
              placeholder="Einrichtung suchen…"
              aria-label="Einrichtung suchen"
              className="h-8 pl-8"
            />
          </div>
          {alleGruppen.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={chip(bundesland === null)} onClick={() => setBundesland(null)}>
                Alle
              </button>
              {alleGruppen.map((g) => (
                <button
                  key={g.code}
                  type="button"
                  className={chip(bundesland === g.code)}
                  onClick={() => setBundesland(bundesland === g.code ? null : g.code)}
                >
                  {g.code.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={cn("max-h-80 overflow-y-auto p-1.5", pending && "opacity-60")}>
          {gruppen.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Keine Einrichtung gefunden.</p>
          ) : (
            gruppen.map((gruppe) => (
              <div key={gruppe.code} className="py-1">
                {alleGruppen.length > 1 ? (
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{gruppe.label}</p>
                ) : null}
                {gruppe.einrichtungen.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    disabled={pending}
                    onClick={() => wechseln(e.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      {e.ort ? <span className="block truncate text-xs text-muted-foreground">{e.ort}</span> : null}
                    </span>
                    {e.id === aktiveId ? <Check className="size-4 shrink-0 text-primary" aria-label="Aktuell geöffnet" /> : null}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="border-t p-1.5">
          <a href="/einrichtung-auswahl" className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
            Alle Einrichtungen im Überblick →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
