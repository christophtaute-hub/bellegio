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

export type SzenarioErgebnis = { personalkostenSimuliert: number; ergebnisSimuliert: number };

/** Reine Funktion für den Szenario-Rechner (Milestone 30, Phase H): Fördererlöse bleiben auf dem
 * heutigen realen Wert fixiert (die Rechner-Varianten kennen keine simulierbare Kinderzahl-Formel für
 * BW/NRW, und Bayern hält zwar eine editierbare Matrix, aber ein einheitliches Verhalten über alle drei
 * Bundesländer ist ehrlicher als ein Bayern-Sonderfall). Personalkosten skalieren linear mit der im
 * jeweiligen Rechner simulierten Stundenänderung (deltaStunden) über ein einzelnes Gehalt/Monat-bei-
 * Vollzeit-Eingabefeld. */
export function berechneSzenarioErgebnis(
  finanzenHeute: Ergebnis,
  deltaStunden: number,
  vollzeitWochenstunden: number,
  gehaltMonatVollzeit: number
): SzenarioErgebnis {
  const deltaKosten =
    vollzeitWochenstunden > 0 ? (deltaStunden / vollzeitWochenstunden) * gehaltMonatVollzeit : 0;
  const personalkostenSimuliert = finanzenHeute.personalkostenMonat + deltaKosten;
  return {
    personalkostenSimuliert,
    ergebnisSimuliert: finanzenHeute.foerdererloeseMonat - personalkostenSimuliert,
  };
}
