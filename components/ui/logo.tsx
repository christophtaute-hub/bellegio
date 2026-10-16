import { cn } from "cn";

/** Das Bellegio-Zeichen (wie das Seiten-Icon): teal Kachel mit „B“. Mit `animiert` atmet es leicht — nur für Ladezustände. */
export function Logo({ className, animiert = false }: { className?: string; animiert?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-12", animiert && "ladezustand-logo", className)}>
      <rect width="32" height="32" rx="8" fill="#006778" />
      <text x="16" y="23" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="19" fontWeight="700" fill="#f8faf9">
        B
      </text>
    </svg>
  );
}
