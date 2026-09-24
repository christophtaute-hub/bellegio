"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { meldeErfolg } from "@/lib/toast";

/** Zeigt einen Erfolg-Toast, wenn der URL-Parameter `gespeichert=1` gesetzt ist (Muster für
 * Formulare, die nach dem Speichern serverseitig per `redirect()` weiterleiten — der Client
 * sieht den Erfolg dadurch erst auf der Zielseite, nicht mehr im Formular selbst), und entfernt
 * den Parameter danach wieder aus der URL, damit ein Reload den Toast nicht erneut auslöst. */
export function ErfolgsToast({ text }: { text: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const gespeichert = searchParams.get("gespeichert") === "1";

  useEffect(() => {
    if (!gespeichert) return;
    meldeErfolg(text);
    const next = new URLSearchParams(searchParams);
    next.delete("gespeichert");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gespeichert]);

  return null;
}
