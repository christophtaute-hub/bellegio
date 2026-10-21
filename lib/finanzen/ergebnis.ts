import {
  berechnePersonalkostenGesamt,
  type PersonalkostenErgebnisProMitarbeiter,
  type PersonalkostenGesamt,
} from "@/lib/finanzen/personalkosten";

/** Woraus sich die Fördererlöse eines Monats zusammensetzen (nur, wenn sie aus einer Formel kommen). */
export type FoerderungDetail = {
  /** Bayern: staatliche Förderung nach Art. 21 (inkl. Qualitätsbonus bzw. U3-Zuschlag). */
  staatlichMonat: number;
  /** Bayern: Eigenanteil der Gemeinde nach Art. 22. */
  kommunalMonat: number;
  /** Bayern bis 2026: Beitragszuschuss des Landes (100 € je Kindergartenkind), den Eltern weitergereicht bekommen. */
  beitragszuschussMonat: number;
  /** Nur, wenn die Einrichtung Personalprogramme ausdrücklich eingetragen hat. */
  personalprogrammeMonat: number;
  /** Bayern ab 2027: Teamkräftepauschale (vorläufig), nur wenn die Einrichtung sie aktiviert hat. */
  teamkraeftepauschaleMonat?: number;
};

export type Ergebnis = {
  /** Summe aller Fördererlöse (staatlich, kommunal, Beitragszuschuss, Personalprogramme) bzw. der manuelle Betrag. */
  foerdererloeseMonat: number;
  /** Aufschlüsselung der Fördererlöse — fehlt bei manuellem Betrag und in NRW. */
  foerderung?: FoerderungDetail;
  /** Sachkosten, die die Einrichtung selbst eingetragen hat (Miete, Verpflegung …). */
  sonstigeKostenMonat?: number;
  personalkostenMonat: number;
  /** Elternbeiträge laut interner Preisliste — null, wenn keine Preisliste hinterlegt ist (dann sind sie nicht Teil des Ergebnisses). */
  elternbeitraegeMonat?: number | null;
  /** Fördererlöse + Elternbeiträge (falls Preisliste vorhanden) − Personalkosten − sonstige Kosten. */
  ergebnisMonat: number;
  personalkostenNichtErfasst: number;
};

export function berechneErgebnis(
  foerdererloeseMonat: number,
  personalkosten: PersonalkostenGesamt,
  elternbeitraegeMonat: number | null = null,
  extras: { foerderung?: FoerderungDetail; sonstigeKostenMonat?: number } = {}
): Ergebnis {
  const sonstige = extras.sonstigeKostenMonat ?? 0;
  return {
    foerdererloeseMonat,
    foerderung: extras.foerderung,
    sonstigeKostenMonat: sonstige,
    elternbeitraegeMonat,
    personalkostenMonat: personalkosten.personalkostenGesamtMonat,
    ergebnisMonat: foerdererloeseMonat + (elternbeitraegeMonat ?? 0) - personalkosten.personalkostenGesamtMonat - sonstige,
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
  jahressonderzahlungProzent: number,
  sonstigeKostenMonat = 0
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
    ergebnisSimuliert: foerdererloeseMonat - personalkosten.personalkostenGesamtMonat - sonstigeKostenMonat,
    personalkostenNichtErfasst: personalkosten.nichtErfasst,
  };
}
