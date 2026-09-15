const BUNDESLAND_KUERZEL: Record<string, string> = {
  by: "BY",
  bw: "BW",
  nrw: "NRW",
};

const BUNDESLAND_LABEL: Record<string, string> = {
  by: "Bayern",
  bw: "Baden-Württemberg",
  nrw: "Nordrhein-Westfalen",
};

const BUNDESLAND_TONE: Record<string, string> = {
  by: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  bw: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  nrw: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function BundeslandBadge({ code }: { code: string }) {
  const kuerzel = BUNDESLAND_KUERZEL[code] ?? code.toUpperCase();
  const label = BUNDESLAND_LABEL[code] ?? code;
  const tone =
    BUNDESLAND_TONE[code] ??
    "bg-secondary text-secondary-foreground";

  return (
    <span
      title={`Diese Einrichtung rechnet nach: ${label}`}
      className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide sm:inline-flex ${tone}`}
    >
      {kuerzel}
    </span>
  );
}
