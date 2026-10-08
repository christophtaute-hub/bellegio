"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { cn } from "cn";

/** Filterformular, das sich selbst abschickt: Auswahlfelder sofort, Textfelder nach kurzer Pause — ein „Filtern“-Knopf ist nicht nötig.
 * Die Werte landen als Adressparameter (wie bisher), die Seite lädt dabei nicht neu und springt nicht nach oben. */
export function AutoFilterForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pfad = usePathname();
  const formular = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, starte] = useTransition();

  function absenden() {
    const form = formular.current;
    if (!form) return;
    const parameter = new URLSearchParams();
    for (const [name, wert] of new FormData(form).entries()) {
      if (typeof wert === "string" && wert !== "") parameter.set(name, wert);
    }
    starte(() => router.replace(`${pfad}?${parameter.toString()}`, { scroll: false }));
  }

  return (
    <form
      ref={formular}
      method="get"
      className={cn(className, pending && "opacity-80")}
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        absenden();
      }}
      onChange={(e) => {
        const ziel = e.target as HTMLElement;
        clearTimeout(timer.current);
        if (ziel instanceof HTMLInputElement && ["text", "search"].includes(ziel.type)) {
          timer.current = setTimeout(absenden, 350);
        } else {
          absenden();
        }
      }}
    >
      {children}
    </form>
  );
}
