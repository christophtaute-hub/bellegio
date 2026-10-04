"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Baby, Building2, CornerDownLeft, LayoutGrid, Search, UserCog } from "lucide-react";
import { oeffneDetailInEinrichtung, setActiveEinrichtung } from "@/lib/actions/einrichtung";
import { sucheGlobal, type SucheErgebnis } from "@/lib/actions/suche";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type Treffer = { key: string; gruppe: string; label: string; sub: string | null; icon: typeof Search; offnen: () => void };

const STATUS_LABEL: Record<string, string> = { aktiv: "aktiv", nachruecker: "Nachrücker", ausgetreten: "ausgetreten" };

/** Globale Suche im Header (auch per Cmd/Strg+K): Einrichtungen, Kinder, Mitarbeitende und App-Funktionen. */
export function GlobalSearch() {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [eingabe, setEingabe] = useState("");
  const [ergebnis, setErgebnis] = useState<SucheErgebnis | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [markiert, setMarkiert] = useState(0);
  const [, startTransition] = useTransition();
  const anfrage = useRef(0);

  useEffect(() => {
    function beiTaste(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOffen((o) => !o);
      }
    }
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, []);

  // Entprellt: erst 250 ms nach der letzten Eingabe suchen; veraltete Antworten werden verworfen.
  useEffect(() => {
    if (!offen) return;
    const text = eingabe.trim();
    if (!text) {
      anfrage.current += 1;
      return;
    }
    const nr = ++anfrage.current;
    const timer = setTimeout(async () => {
      setLaedt(true);
      try {
        const res = await sucheGlobal(text);
        if (nr === anfrage.current) {
          setErgebnis(res);
          setMarkiert(0);
        }
      } finally {
        if (nr === anfrage.current) setLaedt(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [eingabe, offen]);

  const schliessen = useCallback(() => {
    setOffen(false);
    setEingabe("");
    setErgebnis(null);
  }, []);

  const treffer = useMemo<Treffer[]>(() => {
    if (!ergebnis || !eingabe.trim()) return [];
    const liste: Treffer[] = [];
    for (const f of ergebnis.funktionen) {
      liste.push({ key: `f-${f.href}`, gruppe: "Funktionen", label: f.label, sub: null, icon: LayoutGrid, offnen: () => router.push(f.href) });
    }
    for (const e of ergebnis.einrichtungen) {
      const land = BUNDESLAENDER.find((b) => b.code === e.bundeslandCode)?.label ?? e.bundeslandCode;
      liste.push({
        key: `e-${e.id}`,
        gruppe: "Einrichtungen",
        label: e.name,
        sub: [e.ort, land].filter(Boolean).join(" · "),
        icon: Building2,
        offnen: () => startTransition(async () => void (await setActiveEinrichtung(e.id, "/dashboard"))),
      });
    }
    const detail = (einrichtungId: string, pfad: string) => () => {
      if (einrichtungId === ergebnis.aktiveEinrichtungId) router.push(pfad);
      else startTransition(async () => void (await oeffneDetailInEinrichtung(einrichtungId, pfad)));
    };
    for (const k of ergebnis.kinder) {
      liste.push({
        key: `k-${k.id}`,
        gruppe: "Kinder",
        label: k.name,
        sub: [k.einrichtungName, k.gruppe, STATUS_LABEL[k.status] ?? k.status].filter(Boolean).join(" · "),
        icon: Baby,
        offnen: detail(k.einrichtungId, `/kinder/${k.id}`),
      });
    }
    for (const p of ergebnis.team) {
      liste.push({
        key: `t-${p.id}`,
        gruppe: "Mitarbeitende",
        label: p.name,
        sub: [p.einrichtungName, p.rolle].filter(Boolean).join(" · "),
        icon: UserCog,
        offnen: detail(p.einrichtungId, `/team/${p.id}`),
      });
    }
    return liste;
  }, [ergebnis, eingabe, router]);

  function waehle(t: Treffer | undefined) {
    if (!t) return;
    t.offnen();
    setOffen(false);
    setEingabe("");
    setErgebnis(null);
  }

  function beiTaste(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarkiert((m) => Math.min(m + 1, Math.max(treffer.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarkiert((m) => Math.max(m - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      waehle(treffer[markiert]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label="Suchen"
        className="inline-flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-56"
      >
        <Search className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Suchen…</span>
        <kbd className="hidden rounded border px-1 text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={offen} onOpenChange={(o) => (o ? setOffen(true) : schliessen())}>
        <DialogContent showCloseButton={false} className="top-24 -translate-y-0 gap-0 p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Suche</DialogTitle>
          <DialogDescription className="sr-only">Einrichtungen, Kinder, Mitarbeitende und Funktionen suchen</DialogDescription>
          <div className="relative border-b p-2.5">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={beiTaste}
              placeholder="Einrichtung, Kind, Mitarbeitende oder Funktion suchen…"
              aria-label="Suchbegriff"
              maxLength={120}
              className="h-9 border-0 pl-8 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5" role="listbox" aria-label="Suchergebnisse">
            {!eingabe.trim() ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tippe einen Namen oder eine Funktion, z.B. „Müller“, „Nutzer anlegen“ oder „Regenbogen“.
              </p>
            ) : treffer.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{laedt ? "Suche läuft…" : "Keine Treffer."}</p>
            ) : (
              treffer.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={t.key}>
                    {i === 0 || treffer[i - 1].gruppe !== t.gruppe ? (
                      <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t.gruppe}</p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === markiert}
                      onMouseEnter={() => setMarkiert(i)}
                      onClick={() => waehle(t)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                        i === markiert ? "bg-secondary" : "hover:bg-secondary/60"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t.label}</span>
                        {t.sub ? <span className="block truncate text-xs text-muted-foreground">{t.sub}</span> : null}
                      </span>
                      {i === markiert ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
