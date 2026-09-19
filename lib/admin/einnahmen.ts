import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type EinnahmenStatus = "entwurf" | "versendet" | "bezahlt";

export type EinnahmenPosition = {
  betrag: number;
  einrichtungId: string | null;
  einrichtungName: string;
  status: EinnahmenStatus;
  /** Monat des Leistungszeitraums (YYYY-MM). */
  monat: string;
  tragerId: string;
};

/** Alle Rechnungspositionen, die als Einnahme zählen: Entwürfe (erwartet),
 * versendete (offen) und bezahlte Rechnungen. Stornierte Rechnungen und die
 * zugehörigen Gutschriften (storno_von gesetzt) heben sich auf und zählen
 * nicht. */
export async function ladeEinnahmenPositionen(
  supabase: SupabaseClient<Database>
): Promise<EinnahmenPosition[]> {
  const { data } = await supabase
    .from("rechnungspositionen")
    .select(
      "summe_netto, einrichtung_id, einrichtung_name, rechnungen!inner(status, storno_von, leistungszeitraum_von, trager_id)"
    )
    .in("rechnungen.status", ["entwurf", "versendet", "bezahlt"])
    .is("rechnungen.storno_von", null)
    .limit(5000);

  return (data ?? []).map((row) => {
    const rechnung = row.rechnungen as unknown as {
      status: EinnahmenStatus;
      leistungszeitraum_von: string;
      trager_id: string;
    };
    return {
      betrag: Number(row.summe_netto ?? 0),
      einrichtungId: row.einrichtung_id,
      einrichtungName: row.einrichtung_name ?? "Ohne Einrichtung",
      status: rechnung.status,
      monat: rechnung.leistungszeitraum_von.slice(0, 7),
      tragerId: rechnung.trager_id,
    };
  });
}

export type EinnahmenSumme = { bezahlt: number; offen: number; erwartet: number };

export function summiere(rows: EinnahmenPosition[]): EinnahmenSumme {
  const summe: EinnahmenSumme = { bezahlt: 0, offen: 0, erwartet: 0 };
  for (const row of rows) {
    if (row.status === "bezahlt") summe.bezahlt += row.betrag;
    else if (row.status === "versendet") summe.offen += row.betrag;
    else summe.erwartet += row.betrag;
  }
  return summe;
}

export function gruppiere(
  rows: EinnahmenPosition[],
  schluessel: (row: EinnahmenPosition) => string,
  beschriftung: (key: string, row: EinnahmenPosition) => string
): ({ key: string; label: string } & EinnahmenSumme)[] {
  const gruppen = new Map<string, EinnahmenPosition[]>();
  for (const row of rows) {
    const key = schluessel(row);
    gruppen.set(key, [...(gruppen.get(key) ?? []), row]);
  }
  return Array.from(gruppen.entries())
    .map(([key, gruppenRows]) => ({
      key,
      label: beschriftung(key, gruppenRows[0]),
      ...summiere(gruppenRows),
    }))
    .sort((a, b) =>
      /^\d{4}-\d{2}$/.test(a.key) ? a.key.localeCompare(b.key) : a.label.localeCompare(b.label, "de")
    );
}

export function formatMonat(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
