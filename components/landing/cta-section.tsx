import { Reveal } from "@/components/landing/reveal";
import { DemoAnfrageForm } from "@/components/landing/demo-anfrage-form";

export function CtaSection() {
  return (
    <section id="kontakt" className="relative scroll-mt-16 overflow-hidden bg-[#050706] py-20 text-white md:py-32">
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 text-center">
        <Reveal className="flex flex-col items-center gap-5">
          <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Sieh Bellegio mit deinen Zahlen.
          </h2>
          <p className="max-w-xl text-lg text-white/60">
            Schreib uns kurz, in welchem Bundesland du arbeitest — wir zeigen dir Belegung, Personalschlüssel und
            Meldewesen an einem realistischen Beispiel.
          </p>
        </Reveal>
        <Reveal className="w-full" delay={120}>
          <DemoAnfrageForm />
        </Reveal>
      </div>
    </section>
  );
}
