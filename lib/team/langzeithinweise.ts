export type LangzeitArt = "krankheit" | "schwangerschaft" | "mutterschutz";

const LANGZEIT_ARTEN: readonly LangzeitArt[] = ["krankheit", "schwangerschaft", "mutterschutz"];

export function istLangzeitArt(art: string): art is LangzeitArt {
  return (LANGZEIT_ARTEN as readonly string[]).includes(art);
}

export type AusfallRoh = {
  teamId: string;
  name: string;
  art: string;
  von: string;
  bis: string | null;
};

export type LangzeitHinweis = { teamId: string; name: string; art: LangzeitArt; von: string; bis: string | null };

/** Personal, das am Stichtag wegen Krankheit, Schwangerschaft oder Mutterschutz ausfällt — als Erinnerung für die
 * Personalplanung. Andere Ausfallarten (Sonderurlaub, Sonstiges) sind meist kurz geplant und tauchen hier bewusst
 * nicht auf. */
export function ermittleLangzeitHinweise(ausfallzeiten: AusfallRoh[], stichtag: string): LangzeitHinweis[] {
  return ausfallzeiten
    .filter((a) => istLangzeitArt(a.art) && a.von <= stichtag && (a.bis === null || a.bis >= stichtag))
    .map((a) => ({ teamId: a.teamId, name: a.name, art: a.art as LangzeitArt, von: a.von, bis: a.bis }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}
