"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filtereEinrichtungen, gruppiereNachBundesland } from "@/lib/einrichtung/bundesland-gruppen";

type Eintrag = { id: string; name: string; ort: string | null; bundesland_code: string; kachel: ReactNode };

/** Kacheln nach Bundesland gruppiert, mit Suche und Bundesland-Filter. Die Kacheln selbst kommen fertig (und gestreamt)
 * vom Server, hier wird nur gefiltert und angeordnet. */
export function EinrichtungenUebersicht({ eintraege }: { eintraege: Eintrag[] }) {
  const [suche, setSuche] = useState("");
  const [bundesland, setBundesland] = useState<string | null>(null);

  const alleGruppen = useMemo(() => gruppiereNachBundesland(eintraege), [eintraege]);
  const sichtbar = useMemo(() => filtereEinrichtungen(eintraege, suche, bundesland), [eintraege, suche, bundesland]);
  const gruppen = useMemo(() => gruppiereNachBundesland(sichtbar), [sichtbar]);

  const zeigeFilter = eintraege.length > 3;
  const chip = (aktiv: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      aktiv ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex w-full flex-col gap-6">
      {zeigeFilter ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Einrichtung oder Ort suchen…"
              aria-label="Einrichtung suchen"
              className="pl-8"
            />
          </div>
          {alleGruppen.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(bundesland === null)} onClick={() => setBundesland(null)}>
                Alle ({eintraege.length})
              </button>
              {alleGruppen.map((g) => (
                <button
                  key={g.code}
                  type="button"
                  className={chip(bundesland === g.code)}
                  onClick={() => setBundesland(bundesland === g.code ? null : g.code)}
                >
                  {g.label} ({g.einrichtungen.length})
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {gruppen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einrichtung gefunden.</p>
      ) : (
        gruppen.map((gruppe) => (
          <section key={gruppe.code} className="flex flex-col gap-3">
            {alleGruppen.length > 1 ? (
              <h2 className="text-sm font-semibold text-muted-foreground">
                {gruppe.label} <span className="font-normal">({gruppe.einrichtungen.length})</span>
              </h2>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gruppe.einrichtungen.map((e) => (
                <div key={e.id}>{e.kachel}</div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
