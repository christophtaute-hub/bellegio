/** Bereiche, in denen man nach einem Einrichtungs-Wechsel bleiben kann. Detailseiten (z.B. /kinder/<id>) gehören immer zu
 * genau einer Einrichtung und sind deshalb kein gültiges Ziel — es zählt nur der erste Pfadabschnitt. */
const ERLAUBTE_ABSCHNITTE = ["dashboard", "kinder", "team", "gruppen", "controlling", "szenario", "einstellungen", "dokumentation"];

export function wechselZiel(pfad: string | null | undefined): string {
  if (!pfad || !pfad.startsWith("/") || pfad.startsWith("//")) return "/dashboard";
  const abschnitt = pfad.split(/[/?#]/)[1] ?? "";
  return ERLAUBTE_ABSCHNITTE.includes(abschnitt) ? `/${abschnitt}` : "/dashboard";
}
