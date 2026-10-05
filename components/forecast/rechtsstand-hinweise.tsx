import { Info } from "lucide-react";
import { rechtsstandHinweise, type RechtsstandEingabe } from "@/lib/regelwerk/rechtsstand";

export function RechtsstandHinweise(props: RechtsstandEingabe) {
  const hinweise = rechtsstandHinweise(props);
  if (hinweise.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-100">
      <p className="flex items-center gap-1.5 font-medium">
        <Info className="size-3.5" aria-hidden />
        Zum Rechtsstand
      </p>
      {hinweise.map((h) => (
        <p key={h}>{h}</p>
      ))}
    </div>
  );
}
