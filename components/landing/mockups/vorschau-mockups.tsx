import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import ausblick from "@/public/images/landing/personal-ausblick.png";
import belegungsVorschau from "@/public/images/landing/belegungs-vorschau.png";
import pruefungsmappe from "@/public/images/landing/pruefungsmappe.png";

/** Echte Screenshots aus dem Demo-Zugang — siehe scripts/landing-screenshots.ts zum Neuaufnehmen. */

export function AusblickMockup() {
  return (
    <BrowserFrame>
      <Image
        src={ausblick}
        alt="Personal-Ausblick im Bellegio-Dashboard: reicht das Personal in den nächsten 18 Monaten?"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function BelegungMockup() {
  return (
    <BrowserFrame>
      <Image
        src={belegungsVorschau}
        alt="Belegungs-Vorschau in Bellegio: freie Plätze je Gruppe und Monat"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}

export function MappeMockup() {
  return (
    <BrowserFrame>
      <Image src={pruefungsmappe} alt="Prüfungsmappe in Bellegio: Deckblatt für Aufsicht, Jugendamt und Träger" className="h-auto w-full" />
    </BrowserFrame>
  );
}
