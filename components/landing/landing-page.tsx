import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { StorySection } from "@/components/landing/story-section";
import { BundeslandSwitcher } from "@/components/landing/bundesland-switcher";
import { EinblickeSection } from "@/components/landing/einblicke-section";
import { PreiseSection } from "@/components/landing/preise-section";
import type { Listenpreise } from "@/lib/preise";
import { VertrauenSection } from "@/components/landing/vertrauen-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Reveal } from "@/components/landing/reveal";
import { KindMockup } from "@/components/landing/mockups/kind-mockup";
import { TeamMockup } from "@/components/landing/mockups/team-mockup";
import { KategorisierungMockup } from "@/components/landing/mockups/kategorisierung-mockup";
import { AusblickMockup, BelegungMockup, MappeMockup } from "@/components/landing/mockups/vorschau-mockups";
import {
  ControllingMockup,
  EinrichtungenMockup,
  FinanzenMockup,
  SucheMockup,
  SzenarioFinanzenMockup,
} from "@/components/landing/mockups/uebersicht-mockups";

export function LandingPage({ preise }: { preise: Listenpreise }) {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />

        <StorySection
          id="traeger"
          eyebrow="Alle Einrichtungen im Blick"
          titel="Ein Träger, viele Kitas — eine Übersicht."
          text="Nach dem Login siehst du jede Einrichtung als Kachel mit Belegung und Personal-Ampel, nach Bundesland sortiert. Ein Klick öffnet die Kita, die Suche findet jedes Kind und jede Fachkraft."
          punkte={[
            "Kacheln je Einrichtung mit Belegung und Personal-Ampel — nach Bundesland gruppiert",
            "Schnellwechsler im Header: von Kita zu Kita springen und im selben Bereich bleiben",
            "Globale Suche (Strg/Cmd + K) für Einrichtungen, Kinder, Mitarbeitende und Funktionen",
            "Mitarbeitende sehen nur die Einrichtungen und Bereiche, für die sie Rechte haben",
          ]}
          mockups={[<EinrichtungenMockup key="einrichtungen" />, <SucheMockup key="suche" />]}
        />

        <StorySection
          id="kind"
          hintergrund="getoent"
          spiegeln
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
          eyebrow="Das Team im Blick"
          titel="Der Personalschlüssel ist kein Bauchgefühl."
          text="Bellegio rechnet aus, ob dein Personal reicht — heute und in den kommenden Monaten. So siehst du Engpässe, bevor sie zum Problem werden."
          punkte={[
            "Personal-Ausblick: ein Satz sagt dir, ab wann dein Personal nicht mehr reicht — mit Verlauf für die nächsten 18 Monate",
            "Austritte, Teilzeit und Ausfallzeiten fließen direkt in die Rechnung ein",
            "Im Szenario-Rechner spielst du Änderungen durch, ohne echte Daten anzufassen",
            "Jede Änderung am Personal wird protokolliert",
          ]}
          mockups={[<TeamMockup key="team" />, <AusblickMockup key="ausblick" />]}
        />

        <StorySection
          id="finanzen"
          hintergrund="getoent"
          spiegeln
          eyebrow="Finanzen im Blick"
          titel="Was kostet dein Personal — und was kommt rein?"
          text="Fördererlöse und Personalkosten stehen neben der Belegung. Im Szenario-Rechner siehst du, was eine zusätzliche Fachkraft oder ein Austritt für das Ergebnis bedeutet."
          punkte={[
            "Fördererlöse nach den Regeln des Bundeslands (Bayern, NRW) oder als eigener Betrag (Baden-Württemberg)",
            "Personalkosten nach TVöD SuE oder mit eigenem Gehalt je Mitarbeitendem, inklusive Lohnnebenkosten",
            "Szenario-Rechner mit Gehaltsfeld je Zeile — ohne echte Daten anzufassen",
            "Finanzen sehen nur Nutzer mit eigenem Recht, getrennt von Belegung und Personal",
            "Planungsgröße: Elternbeiträge, kommunale Anteile und Sachkosten sind nicht enthalten",
          ]}
          mockups={[<FinanzenMockup key="finanzen" />, <SzenarioFinanzenMockup key="szenario" />]}
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
          hintergrund="getoent"
          spiegeln
          eyebrow="Meldewesen ohne Excel"
          titel="Die Statistik aus einem Guss."
          text="Kinder nach Wochenstunden, Monat für Monat und inklusive Kindern mit I-Status — in allen drei Bundesländern gleich aufgebaut und mit einem Klick als Excel oder PDF exportiert."
          punkte={[
            "Controlling je Monat: Kopfzahl sowie ungewichtete und gewichtete Buchungsstunden je Gruppenart",
            "Kategorisierung nach Kalenderjahr von Januar bis Dezember, inklusive I-Status",
            "Prüfungsmappe für Aufsicht, Jugendamt und Träger — als PDF und Excel",
          ]}
          mockups={[<ControllingMockup key="controlling" />, <KategorisierungMockup key="kat" />, <MappeMockup key="mappe" />]}
        />

        <EinblickeSection />
        <PreiseSection preise={preise} />
        <VertrauenSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
