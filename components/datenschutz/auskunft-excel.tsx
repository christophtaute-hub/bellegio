"use client";

import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuskunftExcel({ blaetter, dateiname }: { blaetter: { name: string; zeilen: string[][] }[]; dateiname: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="print:hidden"
      onClick={() => {
        const mappe = XLSX.utils.book_new();
        for (const blatt of blaetter) {
          const sheet = XLSX.utils.aoa_to_sheet(blatt.zeilen);
          sheet["!cols"] = (blatt.zeilen[0] ?? []).map(() => ({ wch: 28 }));
          XLSX.utils.book_append_sheet(mappe, sheet, blatt.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
        }
        XLSX.writeFile(mappe, dateiname);
      }}
    >
      <Download className="size-3.5" />
      Excel
    </Button>
  );
}
