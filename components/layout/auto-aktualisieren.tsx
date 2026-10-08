"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MIN_ABSTAND_MS = 60_000;
const INTERVALL_MS = 5 * 60_000;

/** Hält die Zahlen frisch, ohne dass jemand neu laden muss: Kommt man zum Tab zurück oder ist die Seite länger offen, werden die
 * Serverdaten im Hintergrund neu geholt (Eingaben in Formularen bleiben dabei erhalten). */
export function AutoAktualisieren() {
  const router = useRouter();

  useEffect(() => {
    let zuletzt = Date.now();
    const aktualisiere = () => {
      if (document.visibilityState !== "visible" || Date.now() - zuletzt < MIN_ABSTAND_MS) return;
      zuletzt = Date.now();
      router.refresh();
    };
    const intervall = window.setInterval(aktualisiere, INTERVALL_MS);
    document.addEventListener("visibilitychange", aktualisiere);
    window.addEventListener("focus", aktualisiere);
    return () => {
      window.clearInterval(intervall);
      document.removeEventListener("visibilitychange", aktualisiere);
      window.removeEventListener("focus", aktualisiere);
    };
  }, [router]);

  return null;
}
