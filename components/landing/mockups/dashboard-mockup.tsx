import Image from "next/image";
import { BrowserFrame } from "@/components/landing/browser-frame";
import dashboard from "@/public/images/landing/dashboard.png";

/** Echtes Dashboard-Bildschirmfoto aus dem Demo-Zugang (Testkita Bayern) — siehe
 * scripts/landing-screenshots.ts zum Neuaufnehmen nach größeren UI-Änderungen. */
export function DashboardMockup() {
  return (
    <BrowserFrame>
      <Image src={dashboard} alt="Bellegio Dashboard: Kinder und Personal als Ringe, Verlauf über die nächsten Monate und Hinweis, ab wann Personal fehlt" className="h-auto w-full" priority />
    </BrowserFrame>
  );
}
