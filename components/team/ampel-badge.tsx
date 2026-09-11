import { cn } from "cn";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

const AMPEL_CONFIG: Record<Ampel, { label: string; className: string }> = {
  gruen: {
    label: "Anstellungsschlüssel erfüllt",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  gelb: {
    label: "Knapp am Limit",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  },
  rot: {
    label: "Anstellungsschlüssel nicht erfüllt",
    className: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
};

export function AmpelBadge({ ampel }: { ampel: Ampel }) {
  const config = AMPEL_CONFIG[ampel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
        config.className
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
      {config.label}
    </span>
  );
}
