import { Database, ShieldCheck, History, FileSpreadsheet } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const PUNKTE = [
  { icon: Database, titel: "Daten in Frankfurt", text: "Die Datenbank läuft in einem Rechenzentrum in Frankfurt am Main (EU)." },
  { icon: ShieldCheck, titel: "Rechte je Bereich", text: "Belegung, Personal, Controlling und Szenario-Rechner lassen sich je Einrichtung einzeln auf ansehen oder bearbeiten stellen." },
  { icon: History, titel: "Änderungsprotokoll", text: "Änderungen an Kindern und Personal werden mit Zeitpunkt und Nutzer festgehalten." },
  { icon: FileSpreadsheet, titel: "Export jederzeit", text: "Zahlen lassen sich als Excel und PDF herausziehen — deine Daten bleiben deine Daten." },
];

export function VertrauenSection() {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="font-heading max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
            Sensible Daten brauchen klare Regeln.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PUNKTE.map(({ icon: Icon, titel, text }, i) => (
            <Reveal key={titel} delay={i * 80}>
              <div className="flex flex-col gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">{titel}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
