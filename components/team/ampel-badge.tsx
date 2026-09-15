import { cn } from "cn";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

const DEFAULT_LABELS: Record<Ampel, string> = {
  gruen: "Anstellungsschlüssel erfüllt",
  gelb: "Knapp am Limit",
  rot: "Anstellungsschlüssel nicht erfüllt",
};

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
  /** Bundesland-spezifischer Text statt der bayerischen Standardbeschriftung. */
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
