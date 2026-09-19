"use client";

import * as XLSX from "xlsx";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRows, buildKategorisierungRows } from "@/components/forecast/export-buttons";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";
import type { KategorisierungsMonat } from "@/lib/controlling/jahreskategorisierung";

export type MappeMeta = {
  einrichtung: string;
  anschrift: string;
  bundesland: string;
  zeitraum: string;
  erstelltAm: string;
  erstelltVon: string;
};

export type AuditMonat = { monat: string; kinder: number; personal: number };

export function MappeExportButtons({
  months,
  kategorisierung,
  audit,
  meta,
}: {
  months: ForecastMonth[];
  kategorisierung: { jahr: number; monate: KategorisierungsMonat[] };
  audit: AuditMonat[];
  meta: MappeMeta;
}) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet([
              { Angabe: "Einrichtung", Wert: meta.einrichtung },
              { Angabe: "Anschrift", Wert: meta.anschrift },
              { Angabe: "Bundesland", Wert: meta.bundesland },
              { Angabe: "Zeitraum", Wert: meta.zeitraum },
              { Angabe: "Erstellt am", Wert: meta.erstelltAm },
              { Angabe: "Erstellt von", Wert: meta.erstelltVon },
            ]),
            "Deckblatt"
          );
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildRows(months)), "Belegung und Personal");
          XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(buildKategorisierungRows(kategorisierung.monate)),
            `Kategorisierung ${kategorisierung.jahr}`
          );
          XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(
              audit.map((a) => ({ Monat: a.monat, "Änderungen Kinder": a.kinder, "Änderungen Personal": a.personal }))
            ),
            "Änderungen"
          );
          XLSX.writeFile(workbook, `bellegio-pruefungsmappe-${meta.einrichtung.replace(/[^\w-]+/g, "-")}.xlsx`);
        }}
      >
        Excel exportieren
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer className="size-3.5" />
        Als PDF speichern
      </Button>
    </div>
  );
}
