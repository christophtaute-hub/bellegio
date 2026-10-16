import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import einrichtungen from "@/public/images/landing/einrichtungen.png";
import suche from "@/public/images/landing/suche.png";
import finanzenUebersicht from "@/public/images/landing/finanzen-uebersicht.png";
import planung from "@/public/images/landing/planung.png";
import gruppen from "@/public/images/landing/gruppen.png";
import controlling from "@/public/images/landing/controlling.png";

/** Echte Bildschirmfotos aus dem Demo-Zugang — siehe scripts/landing-screenshots.ts zum Neuaufnehmen. */

export function EinrichtungenMockup() {
  return (
    <BrowserFrame>
      <Image
        src={einrichtungen}
        alt="Kita-Ampel in Bellegio: je Einrichtung eine Ampel für Belegung und eine für Personal, mit Ergebnis im Monat, nach Bundesland gruppiert"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function SucheMockup() {
  return (
    <BrowserFrame>
      <Image src={suche} alt="Globale Suche in Bellegio: Kinder, Mitarbeitende, Einrichtungen und Funktionen mit Tastenkürzel" className="h-auto w-full" />
    </BrowserFrame>
  );
}

export function FinanzenMockup() {
  return (
    <BrowserFrame>
      <Image
        src={finanzenUebersicht}
        alt="Bellegio Controlling: Fördererlöse, Elternbeiträge, Personalkosten und Ergebnis je Monat"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function PlanungMockup() {
  return (
    <BrowserFrame>
      <Image
        src={planung}
        alt="Planung in Bellegio: Annahmen eingeben, „Jetzt berechnen“ und das Ergebnis mit Personalbedarf, Förderung, Kosten und Ampel"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function GruppenMockup() {
  return (
    <BrowserFrame>
      <Image src={gruppen} alt="Gruppen in Bellegio: Belegung und Plätze je Gruppe" className="h-auto w-full" />
    </BrowserFrame>
  );
}

export function ControllingMockup() {
  return (
    <BrowserFrame>
      <Image
        src={controlling}
        alt="Controlling in Bellegio: Kopfzahl sowie gewichtete und ungewichtete Buchungsstunden je Gruppenart und Monat"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}
