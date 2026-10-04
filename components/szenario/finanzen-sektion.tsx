"use client";

import { Wallet } from "lucide-react";
import { ERGEBNIS_HINWEIS } from "@/lib/finanzen/hinweise";
import { MetricCard } from "@/components/ui/metric-card";
import { berechneSzenarioErgebnis, type Ergebnis, type SzenarioPersonalZeile } from "@/lib/finanzen/ergebnis";

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/** Finanzen-Abschnitt für alle drei Szenario-Rechner-Varianten (Bayern/BW/NRW) — bewusst ein
 * gemeinsames Bauteil statt dreier Kopien. Fördererlöse bleiben auf dem heutigen realen Wert fixiert
 * (Milestone 30, Phase H: nur Bayern hat im Rechner überhaupt eine editierbare Kinder-Matrix, BW/NRW
 * kennen dort gar keine Kinderzahl — ein einheitlicher fixer Fördererlöse-Wert vermeidet, dass die drei
 * Varianten unterschiedlich "ehrlich" simulieren). Personalkosten sind seit Milestone 31, Punkt D eine
 * echte Summe aus den Gehalt-Feldern der Personal-Zeilen oben (vorbefüllt mit dem echten Vollzeit-Gehalt
 * bestehender Teammitglieder, frei editierbar — auch für neu hinzugefügte Zeilen), statt eines einzelnen
 * Gehalt-Felds × Stunden-Delta. */
export function FinanzenSektion({
  finanzenHeute,
  personal,
  vollzeitWochenstunden,
  lohnnebenkostenProzent,
  jahressonderzahlungProzent,
}: {
  finanzenHeute: Ergebnis;
  personal: SzenarioPersonalZeile[];
  vollzeitWochenstunden: number;
  lohnnebenkostenProzent: number;
  jahressonderzahlungProzent: number;
}) {
  const { personalkostenSimuliert, ergebnisSimuliert, personalkostenNichtErfasst } = berechneSzenarioErgebnis(
    finanzenHeute.foerdererloeseMonat,
    personal,
    vollzeitWochenstunden,
    lohnnebenkostenProzent,
    jahressonderzahlungProzent
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg text-primary">Finanzen</h2>
      <p className="text-xs text-muted-foreground">
        Fördererlöse bleiben auf dem heutigen realen Wert fixiert (in diesem Rechner nicht mitsimulierbar).
        Personalkosten sind die echte Summe aus den Gehalt-Feldern beim Personal oben — bei bestehenden
        Mitarbeitenden mit ihrem echten Vollzeit-Gehalt vorbefüllt, bei neu hinzugefügten Zeilen frei
        editierbar, inklusive Lohnnebenkosten und Jahressonderzahlung.
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Fördererlöse (heute, real)" value={formatEuro(finanzenHeute.foerdererloeseMonat)} icon={<Wallet />} />
        <MetricCard label="Personalkosten (simuliert)" value={formatEuro(personalkostenSimuliert)} icon={<Wallet />} />
        <MetricCard
          label="Ergebnis (simuliert)"
          value={formatEuro(ergebnisSimuliert)}
          icon={<Wallet />}
          tone={ergebnisSimuliert < 0 ? "warn" : "default"}
        />
      </div>
      <p className="text-xs text-muted-foreground">{ERGEBNIS_HINWEIS}</p>
      {personalkostenNichtErfasst > 0 ? (
        <p className="text-xs text-muted-foreground">
          {personalkostenNichtErfasst} Personal-Zeile{personalkostenNichtErfasst === 1 ? "" : "n"} ohne Gehalt-Angabe
          — fehlt in der Summe.
        </p>
      ) : null}
    </section>
  );
}
