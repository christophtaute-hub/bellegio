/** Der I-Status eines Kindes kann befristet sein (gültig von / bis). Ohne Datum gilt er unbefristet; die Statistik zählt das Kind
 * nur in Monaten, in denen er gilt. `von`/`bis` sind ISO-Daten (YYYY-MM-DD), beide Grenzen inklusive. */
export function istStatusAmStichtag(kind: { hat_behinderung: boolean; i_status_von: string | null; i_status_bis: string | null }, stichtag: string): boolean {
  if (!kind.hat_behinderung) return false;
  if (kind.i_status_von && stichtag < kind.i_status_von) return false;
  if (kind.i_status_bis && stichtag > kind.i_status_bis) return false;
  return true;
}
