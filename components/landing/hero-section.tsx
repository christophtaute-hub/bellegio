import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "@/components/landing/mockups/dashboard-mockup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/30 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 bottom-1/4 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-6 pt-20 text-center md:pt-28">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs tracking-wide text-white/70 uppercase">
          {["Bayern", "Baden-Württemberg", "Nordrhein-Westfalen"].map((land) => (
            <span key={land} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5">
              {land}
            </span>
          ))}
        </div>
        <h1 className="font-heading max-w-5xl text-5xl leading-[1.03] font-semibold tracking-tight text-balance md:text-8xl">
          Jedes Kind im Blick.
          <br />
          <span className="text-white/45">Jede Fachkraft am richtigen Platz.</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/60 md:text-xl">
          Bellegio bringt Belegung, Personalschlüssel und Meldewesen zusammen — und rechnet in jedem Bundesland nach
          dem Recht, das dort gilt.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            shape="pill"
            className="gap-2 bg-white px-8 text-black hover:bg-white/90"
            nativeButton={false}
            render={<Link href="/#kontakt" />}
          >
            Demo anfragen
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            shape="pill"
            variant="ghost"
            className="px-6 text-white hover:bg-white/10 hover:text-white"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Anmelden
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl px-6 pb-20 md:mt-24 md:pb-28">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-2 shadow-[0_60px_140px_-30px_rgba(0,0,0,0.9)] md:p-3">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
