/** Sitzplatz-Anzeige einer Gruppe: 1..Sollplätze, in der übergebenen Reihenfolge (Aufrufer sortiert i.d.R. nach
 * Alter) belegt, freie Plätze bleiben leer statt einer wilden Mischung aus freiem Text und Zeilenindex. Sind mehr
 * aktive Kinder vorhanden als Sollplätze, bekommen die überzähligen trotzdem einen (dann über die Sollplätze
 * hinausgehenden) Platz — niemand verschwindet aus der Liste. */
export type SitzplatzZeile<K> = { platz: number; kind: K | null };

export function berechneSitzplaetze<K>(sollplatze: number, kinderSortiert: K[]): SitzplatzZeile<K>[] {
  const anzahlZeilen = Math.max(sollplatze, kinderSortiert.length);
  const zeilen: SitzplatzZeile<K>[] = [];
  for (let i = 0; i < anzahlZeilen; i++) {
    const kind = kinderSortiert[i];
    zeilen.push({ platz: i + 1, kind: kind ?? null });
  }
  return zeilen;
}

export type GruppenBelegungsStatus = "frei" | "voll" | "ueberbelegt";

/** Belegungsstatus einer Gruppe aus Sollplätzen und tatsächlich belegten Plätzen — dieselbe
 * Klassifizierung, die bisher inline auf der Gruppen-Detailseite berechnet wurde, jetzt als
 * eigene, testbare Funktion. */
export function bestimmeBelegungsStatus(sollplatze: number, belegt: number): GruppenBelegungsStatus {
  if (belegt > sollplatze) return "ueberbelegt";
  if (belegt === sollplatze) return "voll";
  return "frei";
}

/** Platznummer eines Kindes in einer berechneten Sitzplatzliste — für den Nachrücker-Bezug (Phase 5): welchen
 * Platz hat das Kind, das der Nachrücker ersetzt? `null`, wenn das Kind aktuell keinen Platz (mehr) belegt. */
export function findePlatzVonKindId<K extends { id: string }>(
  zeilen: SitzplatzZeile<K>[],
  kindId: string | null
): number | null {
  if (!kindId) return null;
  const treffer = zeilen.find((z) => z.kind?.id === kindId);
  return treffer?.platz ?? null;
}
