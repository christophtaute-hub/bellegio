"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";

/** Blendet Inhalte beim Hereinscrollen sanft ein. Inhalte im ersten Bildschirm
 * und bei "reduzierter Bewegung" bleiben unverändert sichtbar; ohne JavaScript
 * ist ohnehin alles sichtbar (der versteckte Zustand wird erst im Browser gesetzt). */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([eintrag]) => {
        if (eintrag.isIntersecting) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out data-[reveal=hidden]:translate-y-8 data-[reveal=hidden]:opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
