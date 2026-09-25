import type { PersonalkostenGesamt } from "@/lib/finanzen/personalkosten";

export type Ergebnis = {
  foerdererloeseMonat: number;
  personalkostenMonat: number;
  /** Fördererlöse − Personalkosten. Elternbeiträge bewusst NICHT enthalten (Milestone 29c, Phase 1
   * beschränkt sich darauf — eigener, späterer Schritt). */
  ergebnisMonat: number;
  personalkostenNichtErfasst: number;
};

export function berechneErgebnis(foerdererloeseMonat: number, personalkosten: PersonalkostenGesamt): Ergebnis {
  return {
    foerdererloeseMonat,
    personalkostenMonat: personalkosten.personalkostenGesamtMonat,
    ergebnisMonat: foerdererloeseMonat - personalkosten.personalkostenGesamtMonat,
    personalkostenNichtErfasst: personalkosten.nichtErfasst,
  };
}
