import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { PreisRechner } from "@/components/landing/preis-rechner";
import { hatPreise, type Listenpreise } from "@/lib/preise";
import { formatEuro } from "@/lib/admin/abrechnung";

const ENTHALTEN = [
  "Alle drei Bundesländer: Bayern, Baden-Württemberg und Nordrhein-Westfalen",
  "Belegung, Personal, Controlling und Szenario-Rechner",
  "Personal-Ausblick und Belegungs-Vorschau",
  "Prüfungsmappe, Kategorisierung und Excel-Export",
  "Import deiner bestehenden Excel-Listen",
  "Rechte je Bereich und Einrichtung, Änderungsprotokoll",
];

export function PreiseSection({ preise }: { preise: Listenpreise }) {
  const veroeffentlicht = hatPreise(preise);

  return (
    <section id="preise" className="scroll-mt-16 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4">
          <Reveal>
            <p className="text-sm font-medium tracking-wide text-primary uppercase">Preise</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-heading max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
              Ein Preis, der mit deiner Kita wächst.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Du zahlst eine Grundgebühr je Einrichtung und einen kleinen Betrag je Kind. Keine Module, die du extra
              freischalten musst.
            </p>
          </Reveal>
        </div>

        {veroeffentlicht ? (
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <Reveal>
              <div className="flex flex-col gap-6 rounded-3xl border bg-card p-8">
                <div className="grid grid-cols-2 gap-6">
                  {preise.grundgebuehr !== null ? (
                    <div className="flex flex-col gap-1">
                      <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">{formatEuro(preise.grundgebuehr)}</p>
                      <p className="text-sm text-muted-foreground">je Einrichtung und Monat</p>
                    </div>
                  ) : null}
                  {preise.proKind !== null ? (
                    <div className="flex flex-col gap-1">
                      <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">{formatEuro(preise.proKind)}</p>
                      <p className="text-sm text-muted-foreground">je Kind und Monat</p>
                    </div>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {ENTHALTEN.map((punkt) => (
                    <li key={punkt} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>{punkt}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Alle Preise netto, zuzüglich der gesetzlichen Umsatzsteuer.
                  {preise.hinweis ? ` ${preise.hinweis}` : ""}
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <PreisRechner preise={preise} />
            </Reveal>
          </div>
        ) : (
          <Reveal delay={200}>
            <div className="mt-12 flex max-w-2xl flex-col gap-5 rounded-3xl border bg-card p-8">
              <p className="text-lg">
                Die Preise stehen in Kürze hier. Wenn du jetzt schon wissen möchtest, was Bellegio für deine
                Einrichtungen kostet, sag uns kurz Bescheid — du bekommst ein Angebot.
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                {ENTHALTEN.map((punkt) => (
                  <li key={punkt} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{punkt}</span>
                  </li>
                ))}
              </ul>
              <Button shape="pill" nativeButton={false} render={<Link href="/#kontakt" />} className="w-fit">
                Angebot anfragen
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
