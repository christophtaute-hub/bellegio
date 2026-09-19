import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { StorySection } from "@/components/landing/story-section";
import { BundeslandSwitcher } from "@/components/landing/bundesland-switcher";
import { EinblickeSection } from "@/components/landing/einblicke-section";
import { VertrauenSection } from "@/components/landing/vertrauen-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Reveal } from "@/components/landing/reveal";
import { KindMockup } from "@/components/landing/mockups/kind-mockup";
import { TeamMockup } from "@/components/landing/mockups/team-mockup";
import { KategorisierungMockup } from "@/components/landing/mockups/kategorisierung-mockup";
import { RadarMockup, BelegungMockup, MappeMockup } from "@/components/landing/mockups/vorschau-mockups";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />

        <StorySection
          id="kind"
          eyebrow="Das Kind im Mittelpunkt"
          titel="Jedes Kind hat eine Geschichte. Bellegio hält sie fest."
          text="Vom ersten Nachrücker-Eintrag bis zum Schuleintritt: Stammdaten, Buchungszeit, I-Status und Verlauf an einem Ort — und bei jeder Änderung steht, wer sie wann gemacht hat."
          punkte={[
            "Nachrücker erhalten eine Empfehlung, in welche Gruppe sie nach Alter und Geschlecht am besten passen",
            "I-Status ist in allen Bundesländern ein eigenes Merkmal — auch in der Statistik",
            "Der Änderungsverlauf jedes Kindes lässt sich mit einem Klick ausdrucken",
            "In Baden-Württemberg behältst du die Quote auswärtiger Kinder im Blick",
          ]}
          mockups={[<KindMockup key="kind" />]}
        />

        <StorySection
          id="team"
          hintergrund="getoent"
          spiegeln
          eyebrow="Das Team im Blick"
          titel="Der Personalschlüssel ist kein Bauchgefühl."
          text="Bellegio rechnet aus, ob dein Personal reicht — heute und in den kommenden Monaten. So siehst du Engpässe, bevor sie zum Problem werden."
          punkte={[
            "Schlüssel-Radar: Ampel für die nächsten 18 Monate und der Monat, in dem es eng wird",
            "Austritte, Teilzeit und Ausfallzeiten fließen direkt in die Rechnung ein",
            "Im Szenario-Rechner spielst du Änderungen durch, ohne echte Daten anzufassen",
            "Jede Änderung am Personal wird protokolliert",
          ]}
          mockups={[<TeamMockup key="team" />, <RadarMockup key="radar" />]}
        />

        <section id="bundeslaender" className="scroll-mt-16 py-20 md:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-sm font-medium tracking-wide text-primary uppercase">Ein Tool, drei Rechenwege</p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
                  Jedes Land rechnet anders. Bellegio kennt alle drei.
                </h2>
              </Reveal>
              <Reveal delay={160}>
                <p className="max-w-md text-lg text-muted-foreground">
                  Bayern, Baden-Württemberg und Nordrhein-Westfalen folgen völlig unterschiedlichen Gesetzen.
                  Bellegio zeigt in jedem Land nur die passende Berechnung — mit Formel und Quelle.
                </p>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <BundeslandSwitcher />
            </Reveal>
          </div>
        </section>

        <StorySection
          hintergrund="getoent"
          eyebrow="Vorausschau statt Überraschung"
          titel="Was im nächsten Jahr passiert, siehst du heute."
          text="Belegung und Personal lassen sich Monat für Monat vorausberechnen. Freie Plätze, Schuleintritte und Nachrücker greifen ineinander."
          punkte={[
            "Forecast der Belegung und des Personalschlüssels für bis zu 24 Monate",
            "Freie Plätze je Gruppe auf einen Blick",
            "Belegungs-Vorschau mit Vorschlag, welches Nachrücker-Kind in den frei werdenden Platz passt",
          ]}
          mockups={[<BelegungMockup key="belegung" />]}
        />

        <StorySection
          id="meldewesen"
          spiegeln
          eyebrow="Meldewesen ohne Excel"
          titel="Die Statistik aus einem Guss."
          text="Kinder nach Wochenstunden, Monat für Monat und inklusive Kindern mit I-Status — in allen drei Bundesländern gleich aufgebaut und mit einem Klick als Excel oder PDF exportiert."
          punkte={[
            "Kategorisierung nach Kalenderjahr von Januar bis Dezember",
            "Der 1. März als amtlicher Erhebungsstichtag ist markiert",
            "Prüfungsmappe für Aufsicht, Jugendamt und Träger — als PDF und Excel",
          ]}
          mockups={[<KategorisierungMockup key="kat" />, <MappeMockup key="mappe" />]}
        />

        <EinblickeSection />
        <VertrauenSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
