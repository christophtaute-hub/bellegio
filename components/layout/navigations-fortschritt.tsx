"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const START = "bellegio:nav-start";
const ENDE = "bellegio:nav-ende";
/** Spätestens nach dieser Zeit verschwindet die Anzeige — falls eine Navigation nie ankommt. */
const MAX_MS = 15_000;
/** Der Kreis erscheint erst, wenn es länger dauert — sonst flackert er bei schnellen Seiten. */
const KREIS_NACH_MS = 350;

/** Meldet: „Es wird gerade zu einer anderen Seite oder Ansicht gewechselt.“ Für Stellen, die per Code navigieren (router.push …). */
export function startNavigation() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START));
}

/** Meldet: „Fertig“ — für Aktionen, nach denen sich die Adresse nicht ändert (z. B. Einrichtung wechseln auf derselben Seite). */
export function endeNavigation() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ENDE));
}

type Phase = "aus" | "laeuft" | "fertig";

const norm = (pfad: string, suche: string) => `${pfad}?${suche.replace(/^\?/, "")}`;

function Anzeige() {
  const pfad = usePathname();
  const parameter = useSearchParams();
  const adresse = norm(pfad, parameter.toString());
  const adresseBeimStart = useRef(adresse);
  const [phase, setPhase] = useState<Phase>("aus");
  const [breite, setBreite] = useState(0);
  const [kreis, setKreis] = useState(false);
  const timer = useRef<{ kreis?: number; max?: number; aus?: number }>({});

  function stoppeTimer() {
    window.clearTimeout(timer.current.kreis);
    window.clearTimeout(timer.current.max);
    window.clearTimeout(timer.current.aus);
  }

  function beende() {
    stoppeTimer();
    setKreis(false);
    setBreite(100);
    setPhase("fertig");
    timer.current.aus = window.setTimeout(() => {
      setPhase("aus");
      setBreite(0);
    }, 350);
  }

  function starte() {
    stoppeTimer();
    adresseBeimStart.current = norm(window.location.pathname, window.location.search);
    setPhase("laeuft");
    setBreite(12);
    // Im nächsten Takt auf 85 % wachsen lassen — die CSS-Übergangszeit macht daraus eine langsame, glaubwürdige Bewegung.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setBreite(85)));
    timer.current.kreis = window.setTimeout(() => setKreis(true), KREIS_NACH_MS);
    timer.current.max = window.setTimeout(beende, MAX_MS);
  }

  // Start: Klick auf einen Link innerhalb der App, oder ein Signal aus dem Code
  useEffect(() => {
    function beiKlick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.hasAttribute("data-keine-ladeanzeige")) return;
      const ziel = link.getAttribute("target");
      if (ziel && ziel !== "_self") return;
      const url = new URL((link as HTMLAnchorElement).href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // gleiche Seite oder nur ein Anker
      starte();
    }
    function beiAbsenden(e: Event) {
      const form = e.target instanceof HTMLFormElement ? e.target : null;
      if (form?.hasAttribute("data-nav")) starte();
    }
    document.addEventListener("click", beiKlick, true);
    document.addEventListener("submit", beiAbsenden, true);
    window.addEventListener(START, starte);
    window.addEventListener(ENDE, beende);
    return () => {
      document.removeEventListener("click", beiKlick, true);
      document.removeEventListener("submit", beiAbsenden, true);
      window.removeEventListener(START, starte);
      window.removeEventListener(ENDE, beende);
      stoppeTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ende: die Adresse hat sich geändert, die neue Seite ist da
  useEffect(() => {
    if (phase === "laeuft" && adresse !== adresseBeimStart.current) beende();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresse]);

  if (phase === "aus") return null;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px] rounded-r-full bg-primary shadow-[0_0_8px_var(--primary)]"
        style={{
          width: `${breite}%`,
          opacity: phase === "fertig" ? 0 : 1,
          transition: phase === "fertig" ? "width 200ms ease-out, opacity 250ms ease-out 150ms" : "width 9s cubic-bezier(0.1, 0.7, 0.2, 1)",
        }}
      />
      {kreis && phase === "laeuft" ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card/90 px-3.5 py-2 text-sm shadow-lg backdrop-blur animate-in fade-in zoom-in-95"
        >
          <svg className="size-4 animate-spin text-primary motion-reduce:animate-pulse" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-muted-foreground">Lädt …</span>
        </div>
      ) : null}
    </>
  );
}

/** Zeigt bei jedem Seitenwechsel oben einen feinen Fortschrittsbalken und, wenn es länger dauert, einen kleinen drehenden Kreis. */
export function NavigationsFortschritt() {
  return (
    <Suspense fallback={null}>
      <Anzeige />
    </Suspense>
  );
}
