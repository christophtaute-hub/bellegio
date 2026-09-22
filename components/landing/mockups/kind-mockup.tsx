import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import kindProfil from "@/public/images/landing/kind-profil.png";

/** Echtes Kind-Profil aus dem Demo-Zugang — siehe scripts/landing-screenshots.ts zum Neuaufnehmen. */
export function KindMockup() {
  return (
    <BrowserFrame>
      <Image src={kindProfil} alt="Kind-Profil in Bellegio: Stammdaten, Gewichtung und Änderungshistorie" className="h-auto w-full" />
    </BrowserFrame>
  );
}
