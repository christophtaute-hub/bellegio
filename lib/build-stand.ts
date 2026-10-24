/** Welcher Stand der App läuft? Hash und Zeitpunkt werden beim Build in `next.config.ts` eingebrannt (`NEXT_PUBLIC_BUILD_STAND`,
 * `NEXT_PUBLIC_BUILD_ZEIT`). So lässt sich auf bellegio.de sofort erkennen, ob der letzte Push wirklich ausgeliefert wurde. */

export type BuildStand = { stand: string; zeit: string | null };

export function leseBuildStand(): BuildStand {
  return { stand: process.env.NEXT_PUBLIC_BUILD_STAND || "unbekannt", zeit: process.env.NEXT_PUBLIC_BUILD_ZEIT || null };
}

/** „abc1234, gebaut am 24.10.2026 um 10:15 Uhr (UTC)“ — bzw. nur der Stand, wenn der Zeitpunkt fehlt oder ungültig ist. */
export function formatBuildStand({ stand, zeit }: BuildStand): string {
  const datum = zeit ? new Date(zeit) : null;
  if (!datum || Number.isNaN(datum.getTime())) return stand;
  const tag = String(datum.getUTCDate()).padStart(2, "0");
  const monat = String(datum.getUTCMonth() + 1).padStart(2, "0");
  const stunde = String(datum.getUTCHours()).padStart(2, "0");
  const minute = String(datum.getUTCMinutes()).padStart(2, "0");
  return `${stand}, gebaut am ${tag}.${monat}.${datum.getUTCFullYear()} um ${stunde}:${minute} Uhr (UTC)`;
}
