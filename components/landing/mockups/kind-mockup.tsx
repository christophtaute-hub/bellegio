import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { BrowserFrame } from "@/components/landing/browser-frame";

const VERLAUF = [
  { wann: "12.03.2026, 09:14", wer: "Katrin K.", was: "Buchungszeit 35,5h-40h → 40,5h-45h" },
  { wann: "02.03.2026, 14:02", wer: "Navina M.", was: "Gruppe Kinderkrippe → Ganztagsgruppe" },
  { wann: "15.09.2025, 08:30", wer: "Verena R.", was: "Kind angelegt" },
];

export function KindMockup() {
  return (
    <BrowserFrame titel="Kinder · Mia Beispiel">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
            MB
          </div>
          <div className="flex-1">
            <p className="font-heading text-lg font-semibold text-primary">Mia Beispiel</p>
            <p className="text-xs text-muted-foreground">4,3 Jahre · weiblich · Ganztagsgruppe</p>
          </div>
          <Badge variant="secondary">Aktiv</Badge>
          <Badge className="bg-accent/30 text-foreground">I-Status</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {[
            ["Geburtstag", "01.06.2022"],
            ["Eintritt", "01.09.2025"],
            ["Austritt", "01.09.2028"],
            ["Buchungszeit", "40,5h-45h"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-secondary/50 p-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-xl border bg-secondary/30 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <p className="text-xs font-medium text-primary">Gruppen-Passung (Alter &amp; Geschlecht, nur Empfehlung)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">Gruppe III:</span>
            <AmpelBadge ampel="gruen" labels={{ gruen: "Gut passend" }} />
            <span className="text-muted-foreground">Alter passt zur üblichen Spanne (3–6 Jahre).</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Änderungshistorie</p>
          <ul className="flex flex-col gap-1.5">
            {VERLAUF.map((eintrag) => (
              <li key={eintrag.wann} className="rounded-lg border p-2.5 text-xs">
                <span className="font-medium tabular-nums">{eintrag.wann}</span>{" "}
                <span className="text-muted-foreground">— {eintrag.wer}</span>
                <p className="mt-0.5 text-muted-foreground">{eintrag.was}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BrowserFrame>
  );
}
