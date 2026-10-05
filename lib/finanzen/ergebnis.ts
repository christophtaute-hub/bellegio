import {
  berechnePersonalkostenGesamt,
  type PersonalkostenErgebnisProMitarbeiter,
  type PersonalkostenGesamt,
} from "@/lib/finanzen/personalkosten";

export type Ergebnis = {
  foerdererloeseMonat: number;
  personalkostenMonat: number;
  /** Elternbeiträge laut interner Preisliste — null, wenn keine Preisliste hinterlegt ist (dann sind sie nicht Teil des Ergebnisses). */
  elternbeitraegeMonat?: number | null;
  /** Fördererlöse + Elternbeiträge (falls Preisliste vorhanden) − Personalkosten. Kommunaler Anteil und Sachkosten fehlen. */
  ergebnisMonat: number;
  personalkostenNichtErfasst: number;
};

export function berechneErgebnis(
  foerdererloeseMonat: number,
  personalkosten: PersonalkostenGesamt,
  elternbeitraegeMonat: number | null = null
): Ergebnis {
  return {
    foerdererloeseMonat,
    elternbeitraegeMonat,
    personalkostenMonat: personalkosten.personalkostenGesamtMonat,
    ergebnisMonat: foerdererloeseMonat + (elternbeitraegeMonat ?? 0) - personalkosten.personalkostenGesamtMonat,
    personalkostenNichtErfasst: personalkosten.nichtErfasst,
  };
}

export type SzenarioPersonalZeile = { wochenstunden: number; gehaltVollzeit: number };

export type SzenarioErgebnis = {
  personalkostenSimuliert: number;
  ergebnisSimuliert: number;
  personalkostenNichtErfasst: number;
};

/** Reine Funktion für den Szenario-Rechner (Milestone 31, Punkt D — ersetzt das Delta-Modell aus
 * Milestone 30, Phase H): Fördererlöse bleiben auf dem heutigen realen Wert fixiert (die Rechner-
 * Varianten kennen keine simulierbare Kinderzahl-Formel für BW/NRW, und Bayern hält zwar eine
 * editierbare Matrix, aber ein einheitliches Verhalten über alle drei Bundesländer ist ehrlicher als ein
 * Bayern-Sonderfall). Personalkosten sind jetzt eine echte Summe: jede Personal-Zeile trägt ihr eigenes
 * Vollzeit-Monatsgehalt (bei echten Teammitgliedern vorbefüllt, bei neuen Zeilen frei editierbar), linear
 * auf ihre simulierten Wochenstunden skaliert — exakte Wiederverwendung von berechnePersonalkostenGesamt,
 * damit Lohnnebenkosten/Jahressonderzahlung und "nicht erfasst" genauso wie in der echten Berechnung
 * gezählt werden. */
export function berechneSzenarioErgebnis(
  foerdererloeseMonat: number,
  personal: SzenarioPersonalZeile[],
  vollzeitWochenstunden: number,
  lohnnebenkostenProzent: number,
  jahressonderzahlungProzent: number
): SzenarioErgebnis {
  const ergebnisse: PersonalkostenErgebnisProMitarbeiter[] = personal.map((p, i) =>
    p.gehaltVollzeit > 0
      ? {
          teamId: String(i),
          status: "berechnet",
          bruttoMonat: p.gehaltVollzeit * (vollzeitWochenstunden > 0 ? p.wochenstunden / vollzeitWochenstunden : 0),
          quelle: "manuell",
        }
      : { teamId: String(i), status: "nicht_erfasst" }
  );
  const personalkosten = berechnePersonalkostenGesamt(ergebnisse, lohnnebenkostenProzent, jahressonderzahlungProzent);
  return {
    personalkostenSimuliert: personalkosten.personalkostenGesamtMonat,
    ergebnisSimuliert: foerdererloeseMonat - personalkosten.personalkostenGesamtMonat,
    personalkostenNichtErfasst: personalkosten.nichtErfasst,
  };
}
