import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#050706] py-24 text-white md:py-32">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <h2 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Bereit für Kita-Controlling
          <br />
          <span className="text-white/50">ohne Excel?</span>
        </h2>
        <p className="text-lg text-white/60">
          Melde dich an und verwalte Kinder, Gruppen und Personal an einem
          Ort.
        </p>
        <Button
          size="lg"
          shape="pill"
          className="gap-2 bg-white px-8 text-black hover:bg-white/90"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Jetzt anmelden
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
