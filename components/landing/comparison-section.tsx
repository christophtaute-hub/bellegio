import { Check, X } from "lucide-react";

const BISHER = [
  "Excel-Tabellen für Belegung und Plätze",
  "Papierlisten für Personal und Anwesenheiten",
  "Anstellungsschlüssel manuell nachgerechnet",
  "Keine Übersicht über zukünftige Belegung",
];

const MIT_BELLEGIO = [
  "Eine zentrale, immer aktuelle Übersicht",
  "Digitale Verwaltung von Kindern und Personal",
  "Anstellungsschlüssel automatisch berechnet",
  "Prognose für beliebige Stichtage",
];

export function ComparisonSection() {
  return (
    <section className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-primary md:text-4xl">
            Was Bellegio ersetzt
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8">
            <h3 className="font-heading text-lg text-muted-foreground">
              Bisher
            </h3>
            <ul className="mt-6 flex flex-col gap-4">
              {BISHER.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-card p-8">
            <h3 className="font-heading text-lg text-primary">
              Mit Bellegio
            </h3>
            <ul className="mt-6 flex flex-col gap-4">
              {MIT_BELLEGIO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
