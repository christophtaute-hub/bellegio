import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";

export type EinrichtungMitBundesland = { name: string; bundesland_code: string };
export type BundeslandGruppe<T extends EinrichtungMitBundesland> = { code: string; label: string; einrichtungen: T[] };

/** Gruppiert Einrichtungen nach Bundesland in fester Reihenfolge (Bayern, Baden-Württemberg, NRW, danach unbekannte
 * Codes alphabetisch), innerhalb einer Gruppe nach Name. Grundlage für Übersicht und Schnellwechsler. */
export function gruppiereNachBundesland<T extends EinrichtungMitBundesland>(einrichtungen: T[]): BundeslandGruppe<T>[] {
  const nachCode = new Map<string, T[]>();
  for (const e of einrichtungen) {
    const liste = nachCode.get(e.bundesland_code);
    if (liste) liste.push(e);
    else nachCode.set(e.bundesland_code, [e]);
  }
  const bekannt = BUNDESLAENDER.map((b) => b.code as string);
  const codes = [...nachCode.keys()].sort((a, b) => {
    const ia = bekannt.indexOf(a);
    const ib = bekannt.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b, "de");
  });
  return codes.map((code) => ({
    code,
    label: BUNDESLAENDER.find((b) => b.code === code)?.label ?? code.toUpperCase(),
    einrichtungen: [...(nachCode.get(code) ?? [])].sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));
}

/** Filtert nach Suchtext (Name oder Ort, Groß-/Kleinschreibung egal) und optional nach Bundesland-Code. */
export function filtereEinrichtungen<T extends EinrichtungMitBundesland & { ort?: string | null }>(
  einrichtungen: T[],
  suche: string,
  bundeslandCode: string | null
): T[] {
  const begriff = suche.trim().toLowerCase();
  return einrichtungen.filter((e) => {
    if (bundeslandCode && e.bundesland_code !== bundeslandCode) return false;
    if (!begriff) return true;
    return `${e.name} ${e.ort ?? ""}`.toLowerCase().includes(begriff);
  });
}
