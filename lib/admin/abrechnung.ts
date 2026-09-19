import { formatDate } from "@/lib/kita-datum";

export const RECHNUNG_STATUS_LABEL: Record<string, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  bezahlt: "Bezahlt",
  storniert: "Storniert",
};

export function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export type PositionInput = {
  beschreibung: string;
  einrichtung_id: string | null;
  einrichtung_name: string | null;
  menge: number;
  einheit: string;
  einzelpreis_netto: number;
  kinderzahl_snapshot: number | null;
};

export type OperatorKennzahl = {
  trager_id: string;
  trager_name: string;
  einrichtung_id: string | null;
  einrichtung_name: string | null;
  bundesland_code: string | null;
  aktive_kinder: number | null;
  gruppen: number | null;
};

/** Erster und letzter Tag eines Monats ("YYYY-MM") als ISO-Datum. */
export function monatsGrenzen(monat: string): { von: string; bis: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!match) throw new Error("Bitte einen gültigen Monat angeben.");
  const jahr = Number(match[1]);
  const monatNr = Number(match[2]);
  if (monatNr < 1 || monatNr > 12) throw new Error("Bitte einen gültigen Monat angeben.");
  const letzterTag = new Date(Date.UTC(jahr, monatNr, 0)).getUTCDate();
  return { von: `${monat}-01`, bis: `${monat}-${String(letzterTag).padStart(2, "0")}` };
}

/** Rechnungsvorschlag je Einrichtung aus den gepflegten Preisen — ohne Preise
 * entsteht kein Vorschlag, die Positionen werden dann von Hand erfasst. */
export function berechneRechnungsvorschlag(
  einrichtungen: OperatorKennzahl[],
  preise: { grundgebuehr: number | null; proKind: number | null },
  stichtag: string
): PositionInput[] {
  const positionen: PositionInput[] = [];
  for (const e of einrichtungen) {
    if (!e.einrichtung_id || !e.einrichtung_name) continue;
    if (preise.grundgebuehr !== null) {
      positionen.push({
        beschreibung: `Bellegio Grundgebühr — ${e.einrichtung_name}`,
        einrichtung_id: e.einrichtung_id,
        einrichtung_name: e.einrichtung_name,
        menge: 1,
        einheit: "Monat",
        einzelpreis_netto: preise.grundgebuehr,
        kinderzahl_snapshot: null,
      });
    }
    if (preise.proKind !== null) {
      const kinder = e.aktive_kinder ?? 0;
      positionen.push({
        beschreibung: `Bellegio Nutzung je Kind — ${e.einrichtung_name} (${kinder} Kinder am ${formatDate(stichtag)})`,
        einrichtung_id: e.einrichtung_id,
        einrichtung_name: e.einrichtung_name,
        menge: kinder,
        einheit: "Kind",
        einzelpreis_netto: preise.proKind,
        kinderzahl_snapshot: kinder,
      });
    }
  }
  return positionen;
}
