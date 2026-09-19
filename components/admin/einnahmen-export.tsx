"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export type EinnahmenExportZeile = {
  Bezeichnung: string;
  Bezahlt: number;
  "Offen (versendet)": number;
  "Erwartet (Entwurf)": number;
  "Ist gesamt (bezahlt + offen)": number;
};

export function EinnahmenExport({ zeilen, dateiname }: { zeilen: EinnahmenExportZeile[]; dateiname: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(zeilen), "Einnahmen");
          XLSX.writeFile(workbook, `${dateiname}.xlsx`);
        }}
      >
        Excel exportieren
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        Als PDF speichern
      </Button>
    </div>
  );
}
