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

// ---------------------------------------------------------------------------
// Einnahmen-Kopf der Seite „Abrechnung“ (Umsatz nach Rechnungsdatum)
// ---------------------------------------------------------------------------

export type KopfRechnung = {
  id: string;
  nummer: string | null;
  status: "entwurf" | "versendet" | "bezahlt" | "storniert";
  rechnungsdatum: string | null;
  leistungszeitraumVon: string;
  faelligAm: string | null;
  bezahltAm: string | null;
  nettoSumme: number;
  stornoVon: string | null;
  tragerName: string;
};

export async function ladeRechnungenFuerKopf(supabase: SupabaseClient<Database>): Promise<KopfRechnung[]> {
  const { data } = await supabase
    .from("rechnungen")
    .select(
      "id, nummer, status, rechnungsdatum, leistungszeitraum_von, faellig_am, bezahlt_am, summe_netto, storno_von, trager(name)"
    )
    .limit(5000);
  return (data ?? []).map((r) => ({
    id: r.id,
    nummer: r.nummer,
    status: r.status as KopfRechnung["status"],
    rechnungsdatum: r.rechnungsdatum,
    leistungszeitraumVon: r.leistungszeitraum_von,
    faelligAm: r.faellig_am,
    bezahltAm: r.bezahlt_am,
    nettoSumme: Number(r.summe_netto ?? 0),
    stornoVon: r.storno_von,
    tragerName: (r.trager as unknown as { name: string } | null)?.name ?? "—",
  }));
}

export type Zeitfenster = { von: string; bis: string };

export function monatsFenster(monat: string): Zeitfenster {
  const [jahr, m] = monat.split("-").map(Number);
  const letzter = new Date(Date.UTC(jahr, m, 0)).getUTCDate();
  return { von: `${monat}-01`, bis: `${monat}-${String(letzter).padStart(2, "0")}` };
}

export function jahresFenster(jahr: number): Zeitfenster {
  return { von: `${jahr}-01-01`, bis: `${jahr}-12-31` };
}

export function verschiebeMonat(monat: string, delta: number): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export type UmsatzKennzahlen = {
  /** Netto-Umsatz freigegebener Rechnungen (versendet + bezahlt) im Zeitfenster. */
  umsatz: number;
  bezahlt: number;
  /** Versendet und noch nicht fällig. */
  offen: number;
  /** Versendet und Fälligkeit überschritten. */
  ueberfaellig: number;
  anzahl: number;
};

/** Zählt freigegebene Rechnungen nach Rechnungsdatum. Entwürfe, stornierte Rechnungen und die
 * zugehörigen Gutschriften (storno_von gesetzt) zählen nicht — sie heben sich gegenseitig auf. */
export function berechneUmsatz(rows: KopfRechnung[], fenster: Zeitfenster | null, heute: string): UmsatzKennzahlen {
  const kennzahlen: UmsatzKennzahlen = { umsatz: 0, bezahlt: 0, offen: 0, ueberfaellig: 0, anzahl: 0 };
  for (const r of rows) {
    if (r.status !== "versendet" && r.status !== "bezahlt") continue;
    if (r.stornoVon !== null || !r.rechnungsdatum) continue;
    if (fenster && (r.rechnungsdatum < fenster.von || r.rechnungsdatum > fenster.bis)) continue;
    kennzahlen.umsatz += r.nettoSumme;
    kennzahlen.anzahl += 1;
    if (r.status === "bezahlt") kennzahlen.bezahlt += r.nettoSumme;
    else if (r.faelligAm && r.faelligAm < heute) kennzahlen.ueberfaellig += r.nettoSumme;
    else kennzahlen.offen += r.nettoSumme;
  }
  return kennzahlen;
}

/** Veränderung in Prozent gegenüber der Vorperiode; null, wenn es keine Vorperiode mit Umsatz gibt. */
export function veraenderungProzent(aktuell: number, vorher: number): number | null {
  if (!(vorher > 0)) return null;
  return ((aktuell - vorher) / vorher) * 100;
}

export function summeEntwuerfe(rows: KopfRechnung[]): number {
  return rows.filter((r) => r.status === "entwurf").reduce((s, r) => s + r.nettoSumme, 0);
}

export type MonatsPunkt = { monat: string; bezahlt: number; offen: number; erwartet: number };

/** Zwölf Monatswerte eines Jahres: freigegebene Rechnungen nach Rechnungsdatum (bezahlt / offen inkl.
 * überfällig), Entwürfe nach dem Monat der Leistung als „erwartet“. */
export function monatsReihe(rows: KopfRechnung[], jahr: number, heute: string): MonatsPunkt[] {
  return Array.from({ length: 12 }, (_, i) => {
    const monat = `${jahr}-${String(i + 1).padStart(2, "0")}`;
    const u = berechneUmsatz(rows, monatsFenster(monat), heute);
    const erwartet = rows
      .filter((r) => r.status === "entwurf" && r.leistungszeitraumVon.startsWith(monat))
      .reduce((s, r) => s + r.nettoSumme, 0);
    return { monat, bezahlt: u.bezahlt, offen: u.offen + u.ueberfaellig, erwartet };
  });
}

export function letzteRechnungen(rows: KopfRechnung[], anzahl: number): KopfRechnung[] {
  return rows
    .filter((r) => (r.status === "versendet" || r.status === "bezahlt") && r.stornoVon === null && r.rechnungsdatum)
    .sort((a, b) => (b.rechnungsdatum as string).localeCompare(a.rechnungsdatum as string) || (b.nummer ?? "").localeCompare(a.nummer ?? ""))
    .slice(0, anzahl);
}

export function naechsteFaelligkeiten(rows: KopfRechnung[], anzahl: number): KopfRechnung[] {
  return rows
    .filter((r) => r.status === "versendet" && r.stornoVon === null && r.faelligAm)
    .sort((a, b) => (a.faelligAm as string).localeCompare(b.faelligAm as string))
    .slice(0, anzahl);
}

/** Demo-Rechnungen aus dem Seed tragen die Nummer „DEMO-…“ und werden im Kopf gekennzeichnet. */
export function istDemoRechnung(r: Pick<KopfRechnung, "nummer">): boolean {
  return (r.nummer ?? "").startsWith("DEMO-");
}
