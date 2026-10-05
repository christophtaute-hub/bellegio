import { cn } from "cn";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { PERSONAL_STATUS } from "@/lib/ui/status";

const DEFAULT_LABELS: Record<Ampel, string> = PERSONAL_STATUS;

const AMPEL_CLASSNAMES: Record<Ampel, string> = {
  gruen: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  gelb: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  rot: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function AmpelBadge({
  ampel,
  labels,
}: {
  ampel: Ampel;
  /** Eigener Text statt der einheitlichen Statuswörter (z. B. für Passung, nicht für Personal). */
  labels?: Partial<Record<Ampel, string>>;
}) {
  const label = labels?.[ampel] ?? DEFAULT_LABELS[ampel];
  const className = AMPEL_CLASSNAMES[ampel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
        className
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          ampel === "gruen" && "bg-emerald-500",
          ampel === "gelb" && "bg-amber-500",
          ampel === "rot" && "bg-destructive"
        )}
      />
      {label}
    </span>
  );
}
