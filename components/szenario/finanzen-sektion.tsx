"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { berechneSzenarioErgebnis, type Ergebnis } from "@/lib/finanzen/ergebnis";

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatStunden(value: number): string {
  const vorzeichen = value > 0 ? "+" : "";
  return `${vorzeichen}${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Std./Woche`;
}

/** Finanzen-Abschnitt für alle drei Szenario-Rechner-Varianten (Bayern/BW/NRW) — bewusst ein
 * gemeinsames Bauteil statt dreier Kopien. Fördererlöse bleiben auf dem heutigen realen Wert fixiert
 * (Milestone 30, Phase H: nur Bayern hat im Rechner überhaupt eine editierbare Kinder-Matrix, BW/NRW
 * kennen dort gar keine Kinderzahl — ein einheitlicher fixer Fördererlöse-Wert vermeidet, dass die drei
 * Varianten unterschiedlich "ehrlich" simulieren). Personalkosten passen sich an die im jeweiligen
 * Rechner bereits simulierte Personal-Stundenänderung an (deltaStunden, vom Elternteil berechnet aus
 * dessen eigenem personal-State), skaliert über ein einzelnes freies Gehalt/Monat-Eingabefeld. */
export function FinanzenSektion({
  finanzenHeute,
  vollzeitWochenstunden,
  deltaStunden,
}: {
  finanzenHeute: Ergebnis;
  vollzeitWochenstunden: number;
  deltaStunden: number;
}) {
  const [gehalt, setGehalt] = useState(0);
  const { personalkostenSimuliert, ergebnisSimuliert } = berechneSzenarioErgebnis(
    finanzenHeute,
    deltaStunden,
    vollzeitWochenstunden,
    gehalt
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg text-primary">Finanzen</h2>
      <p className="text-xs text-muted-foreground">
        Fördererlöse bleiben auf dem heutigen realen Wert fixiert (in diesem Rechner nicht mitsimulierbar). Die
        Personalkosten passen sich an die oben simulierte Personal-Änderung an ({formatStunden(deltaStunden)} gegenüber
        heute) — dafür unten das Monatsgehalt bei Vollzeit für diese Änderung eintragen.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="szenario-gehalt" className="text-xs text-muted-foreground">
          Gehalt/Monat bei Vollzeit für die Änderung (€)
        </label>
        <Input
          id="szenario-gehalt"
          type="number"
          min={0}
          step={50}
          className="h-8 w-40"
          value={gehalt}
          onChange={(e) => setGehalt(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
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
      {finanzenHeute.personalkostenNichtErfasst > 0 ? (
        <p className="text-xs text-muted-foreground">
          {finanzenHeute.personalkostenNichtErfasst} Mitarbeitende ohne erfasste Vergütung — ihre echten Kosten fehlen
          in der Basis und damit auch in der Simulation.
        </p>
      ) : null}
    </section>
  );
}
