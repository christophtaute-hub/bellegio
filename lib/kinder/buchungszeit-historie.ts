export type HistorieEintrag = { gueltig_ab: string; buchungszeit_band_id: string | null };

/** Welches Band galt an einem Stichtag: die Zeile mit dem größten `gueltig_ab <= stichtag`. Spiegelt die
 * gleichnamige Logik in der Datenbankfunktion `kinder_presence_at_date` — wird hier für Auswertungen gebraucht,
 * die nicht über den RPC laufen (Kalenderjahr-Kategorisierung: ein Kind, zwölf Stichtage). */
export function resolveBandAmStichtag(historie: HistorieEintrag[], stichtag: string): string | null {
  let treffer: HistorieEintrag | null = null;
  for (const eintrag of historie) {
    if (eintrag.gueltig_ab > stichtag) continue;
    if (!treffer || eintrag.gueltig_ab > treffer.gueltig_ab) treffer = eintrag;
  }
  return treffer?.buchungszeit_band_id ?? null;
}

/** Ändert sich das Band tatsächlich? Nur dann lohnt ein neuer Historie-Eintrag — sonst würde jedes Speichern
 * (z. B. nur die Notizen geändert) einen unnötigen Eintrag erzeugen. */
export function sollHistorieGeschriebenWerden(altesBand: string | null, neuesBand: string | null): boolean {
  return altesBand !== neuesBand;
}
