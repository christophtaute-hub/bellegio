import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import kategorisierung from "@/public/images/landing/kategorisierung.png";

/** Echter Ausschnitt der Kalenderjahr-Kategorisierung aus dem Demo-Zugang — siehe
 * scripts/landing-screenshots.ts zum Neuaufnehmen. */
export function KategorisierungMockup() {
  return (
    <BrowserFrame>
      <Image
        src={kategorisierung}
        alt="Kategorisierung nach Kalenderjahr in Bellegio: Kinder je Wochenstunden-Band und Monat, inkl. I-Status"
        className="h-auto w-full"
      />
    </BrowserFrame>
  );
}
