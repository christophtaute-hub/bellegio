import { cn } from "cn";
import { AMPEL_ARTEN, AMPEL_TITEL, FARBE_LABEL, ampelFarbe, type AmpelFarbe, type MarketingAmpelArt } from "@/lib/marketing/ampel";

const PUNKT: Record<AmpelFarbe, string> = { gruen: "bg-emerald-500", gelb: "bg-amber-400", orange: "bg-orange-500", rot: "bg-destructive" };

/** Die vier Ampeln einer Einrichtung als Punkte (Reihenfolge: Personalbedarf, Personelle Qualität, Pädagogische Qualität,
 * Belegung). Mit `beschriftet` steht der Name dahinter (Handy-Karten). */
export function AmpelPunkte({ stufen, beschriftet = false }: { stufen: Record<MarketingAmpelArt, number | null>; beschriftet?: boolean }) {
  return (
    <ul className={cn("flex gap-2", beschriftet ? "flex-wrap gap-x-4 gap-y-1" : "items-center")}>
      {AMPEL_ARTEN.map((a) => {
        const farbe = ampelFarbe(a, stufen[a]);
        const text = `${AMPEL_TITEL[a]}: ${farbe ? FARBE_LABEL[farbe] : "nicht bewertet"}`;
        return (
          <li key={a} className="flex items-center gap-1.5 text-xs text-muted-foreground" title={text}>
            <span className={cn("size-3.5 rounded-full", farbe ? PUNKT[farbe] : "border border-dashed border-muted-foreground/50")} role="img" aria-label={text} />
            {beschriftet ? AMPEL_TITEL[a] : null}
          </li>
        );
      })}
    </ul>
  );
}
