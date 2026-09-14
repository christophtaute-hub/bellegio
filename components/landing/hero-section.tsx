import Link from "next/link";
import { ArrowRight, Users, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/20 blur-[100px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pt-24 pb-10 text-center md:pt-32">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs tracking-wide text-white/70 uppercase">
          <span className="size-1.5 rounded-full bg-accent" />
          Kita-Controlling, neu gedacht
        </div>
        <h1 className="font-heading max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance md:text-8xl">
          Belegung und Personal.
          <br />
          <span className="text-white/50">Endlich in Echtzeit.</span>
        </h1>
        <p className="max-w-xl text-lg text-white/60">
          Bellegio ersetzt Excel-Tabellen und Zettelwirtschaft durch eine
          zentrale, BayKiBiG-konforme Steuerung für Plätze, Personal und
          Anstellungsschlüssel.
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

      <div className="relative mx-auto max-w-4xl px-6 pb-24 md:pb-32">
        <div className="rotate-1 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d1615] to-[#050706] p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">
              Anstellungsschlüssel (Bayern)
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Erfüllt
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Anstellungsschlüssel", value: "1 : 8,4", icon: Scale },
              { label: "Kinder gesamt", value: "84", icon: Users },
              { label: "Ist-FK", value: "289,5", icon: Scale },
              { label: "Fachkraftquote", value: "72 %", icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl bg-white/5 p-4 text-left"
              >
                <Icon className="mb-3 size-4 text-primary" />
                <p className="text-xs text-white/50">{label}</p>
                <p className="text-2xl font-semibold text-white tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-16 items-end gap-1 rounded-2xl bg-white/5 p-4">
            {[40, 55, 48, 62, 58, 70, 65, 80, 74, 88, 82, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-primary to-primary/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
