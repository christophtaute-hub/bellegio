import Link from "next/link";
import { ArrowRight, Baby, Users, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 size-64 rounded-full bg-white/5" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-24 text-center md:py-32">
        <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-1.5 text-sm">
          <span className="size-1.5 rounded-full bg-accent" />
          Kita-Controlling für Träger &amp; Einrichtungen
        </div>
        <h1 className="font-heading max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
          Kinder, Personal und Belegung – endlich an einem Ort
        </h1>
        <p className="max-w-xl text-lg text-primary-foreground/80">
          Bellegio ersetzt Excel-Tabellen und Zettelwirtschaft durch eine
          zentrale, BayKiBiG-konforme Übersicht über Plätze, Buchungszeiten
          und Anstellungsschlüssel.
        </p>
        <Button
          size="lg"
          variant="secondary"
          shape="pill"
          className="gap-2 bg-white text-primary hover:bg-white/90"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Jetzt anmelden
          <ArrowRight className="size-4" />
        </Button>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Baby, label: "Kinder & Gruppen" },
            { icon: Users, label: "Personal & Anstellungsschlüssel" },
            { icon: ClipboardCheck, label: "Rechtssicher nach BayKiBiG" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 text-left text-sm font-medium"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="size-4.5" />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
