import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import einrichtungen from "@/public/images/landing/einrichtungen.png";
import suche from "@/public/images/landing/suche.png";
import finanzenUebersicht from "@/public/images/landing/finanzen-uebersicht.png";
import szenarioFinanzen from "@/public/images/landing/szenario-finanzen.png";
import controlling from "@/public/images/landing/controlling.png";

/** Echte Bildschirmfotos aus dem Demo-Zugang — siehe scripts/landing-screenshots.ts zum Neuaufnehmen. */

export function EinrichtungenMockup() {
  return (
    <BrowserFrame>
      <Image
        src={einrichtungen}
        alt="Bellegio-Übersicht aller Einrichtungen eines Trägers, nach Bundesland gruppiert, mit Belegung und Personal-Ampel je Kita"
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
        alt="Bellegio-Übersicht Finanzen: Fördererlöse und Personalkosten im Jahresverlauf"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function SzenarioFinanzenMockup() {
  return (
    <BrowserFrame>
      <Image
        src={szenarioFinanzen}
        alt="Szenario-Rechner in Bellegio: Fördererlöse, simulierte Personalkosten und Ergebnis"
        className="h-auto w-full"
      />
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
