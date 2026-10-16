"use client";

import { useState } from "react";

/** „Jetzt berechnen“-Muster für die Rechner: `eingabe` ändert sich beim Tippen, `berechnet` nur per Klick. Das Ergebnis hängt
 * ausschließlich am berechneten Stand — es schwankt also nicht, während man noch Annahmen eingibt. */
export function useBerechnen<T>(eingabe: T) {
  const [berechnet, setBerechnet] = useState<T | null>(null);
  const veraltet = berechnet !== null && JSON.stringify(berechnet) !== JSON.stringify(eingabe);
  return { berechnet, veraltet, berechne: () => setBerechnet(JSON.parse(JSON.stringify(eingabe)) as T) };
}
