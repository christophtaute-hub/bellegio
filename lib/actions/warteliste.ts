"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung } from "@/lib/server/current-user-role";
import { getCurrentUserRole } from "@/lib/server/current-user-role";

export type WartelisteImportRow = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  gewuenschtes_eintrittsdatum: string | null;
  gewuenschte_betreuungsart: "krippe" | "kindergarten" | "hort" | "altersgemischt" | null;
  kontakt_telefon: string | null;
  kontakt_email: string | null;
};

export type WartelisteImportResult = {
  importiert: number;
  fehler: { zeile: number; grund: string }[];
};

export async function importWartelisteKinder(
  rows: WartelisteImportRow[],
  quelle: string
): Promise<WartelisteImportResult> {
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) throw new Error("Keine aktive Einrichtung ausgewählt.");

  const role = await getCurrentUserRole();
  if (!canWriteBelegung(role)) {
    throw new Error("Keine Berechtigung für den Wartelisten-Import.");
  }

  const supabase = await createClient();
  const fehler: { zeile: number; grund: string }[] = [];
  const gueltigeZeilen: { row: WartelisteImportRow; zeile: number }[] = [];

  rows.forEach((row, index) => {
    const zeile = index + 2; // +1 für 0-Index, +1 für Kopfzeile
    if (!row.vorname.trim() || !row.nachname.trim()) {
      fehler.push({ zeile, grund: "Vor- und Nachname sind Pflichtfelder." });
      return;
    }
    if (!row.geburtsdatum || Number.isNaN(Date.parse(row.geburtsdatum))) {
      fehler.push({ zeile, grund: "Geburtsdatum fehlt oder ist ungültig." });
      return;
    }
    gueltigeZeilen.push({ row, zeile });
  });

  if (gueltigeZeilen.length === 0) {
    return { importiert: 0, fehler };
  }

  const { error, data } = await supabase
    .from("kinder")
    .insert(
      gueltigeZeilen.map(({ row }) => ({
        einrichtung_id: einrichtungId,
        vorname: row.vorname.trim(),
        nachname: row.nachname.trim(),
        geburtsdatum: row.geburtsdatum,
        geschlecht: "keine_angabe",
        status: "geplant",
        gruppe_id: null,
        eintritt: row.gewuenschtes_eintrittsdatum,
        gewuenschte_betreuungsart: row.gewuenschte_betreuungsart,
        kontakt_telefon: row.kontakt_telefon,
        kontakt_email: row.kontakt_email,
        warteliste_quelle: quelle,
      }))
    )
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/kinder");

  return { importiert: data?.length ?? gueltigeZeilen.length, fehler };
}
