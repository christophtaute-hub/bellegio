import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import team from "@/public/images/landing/team.png";

/** Echtes Team-Bildschirmfoto aus dem Demo-Zugang — siehe scripts/landing-screenshots.ts zum Neuaufnehmen. */
export function TeamMockup() {
  return (
    <BrowserFrame>
      <Image src={team} alt="Team-Seite in Bellegio: Anstellungsschlüssel und Personalliste einer Kita" className="h-auto w-full" />
    </BrowserFrame>
  );
}
