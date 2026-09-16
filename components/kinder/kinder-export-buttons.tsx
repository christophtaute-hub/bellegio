"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export type KinderExportRow = {
  Name: string;
  Gruppe: string;
  Geburtstag: string;
  Eintritt: string;
  Austritt: string;
  Status: string;
};

export function KinderExportButtons({ rows }: { rows: KinderExportRow[] }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const sheet = XLSX.utils.json_to_sheet(rows);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, sheet, "Kinder");
          XLSX.writeFile(workbook, "bellegio-kinder.xlsx");
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
