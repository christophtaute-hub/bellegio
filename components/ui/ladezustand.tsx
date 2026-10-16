import { Logo } from "@/components/ui/logo";

/** Ruhiger Ladezustand für ganze Seiten: das Zeichen atmet leicht, darunter läuft ein dünner Balken. Erscheint erst nach
 * ca. 300 ms (CSS), damit schnelle Seiten nicht flackern. */
export function Ladezustand({ text = "Wird geladen…" }: { text?: string }) {
  return (
    <div className="ladezustand-einblenden flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <Logo animiert />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className="ladezustand-balken h-full w-1/3 rounded-full bg-primary" />
      </div>
      <span className="sr-only">{text}</span>
    </div>
  );
}
