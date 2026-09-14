"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function formatMonthLabel(month: string): string {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildRows(months: ForecastMonth[]) {
  const metricRows: { label: string; values: (string | number)[] }[] = [
    {
      label: "Belegte Plätze ohne I-Kind",
      values: months.map((m) => m.belegung.belegteOhneI),
    },
    {
      label: "Belegte Plätze mit I-Kind",
      values: months.map((m) => m.belegung.belegteMitI),
    },
    {
      label: "Plätze nach Betriebserlaubnis",
      values: months.map((m) => m.belegung.plaetzeNachBetriebserlaubnis),
    },
    { label: "Differenz (+/-)", values: months.map((m) => m.belegung.differenz) },
    {
      label: "Gewichtete Kinderzahl",
      values: months.map((m) => Number(m.personal.gewichteteKinderzahl.toFixed(1))),
    },
    {
      label: "Ist-VZÄ",
      values: months.map((m) => Number(m.personal.vzaeIst.toFixed(2))),
    },
    {
      label: "Soll-VZÄ",
      values: months.map((m) => Number(m.personal.vzaeSoll.toFixed(2))),
    },
    {
      label: "Soll-Fachkraft-VZÄ",
      values: months.map((m) => Number(m.personal.vzaeSollFachkraft.toFixed(2))),
    },
    { label: "Ist-FK (Std.)", values: months.map((m) => Number(m.personal.istFk.toFixed(1))) },
    { label: "Ist-EK (Std.)", values: months.map((m) => Number(m.personal.istEk.toFixed(1))) },
    {
      label: "Anstellungsschlüssel (1:X)",
      values: months.map((m) => m.personal.anstellungsschluessel ?? ""),
    },
    {
      label: "Mindestschlüssel 1:11,0",
      values: months.map((m) => (m.personal.mindestschluesselOk ? "Ja" : "Nein")),
    },
    {
      label: "Eigene Zielgröße (nicht gesetzlich)",
      values: months.map((m) => (m.personal.empfohlenerSchluesselOk ? "Ja" : "Nein")),
    },
    {
      label: "Qualifikationsschlüssel",
      values: months.map((m) => (m.personal.qualifikationsschluesselOk ? "Ja" : "Nein")),
    },
  ];

  return metricRows.map((row) => ({
    Kennzahl: row.label,
    ...Object.fromEntries(
      months.map((m, i) => [formatMonthLabel(m.month), row.values[i]])
    ),
  }));
}

export function ExportButtons({ months }: { months: ForecastMonth[] }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const sheet = XLSX.utils.json_to_sheet(buildRows(months));
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, sheet, "Controlling");
          XLSX.writeFile(workbook, "bellegio-controlling.xlsx");
        }}
      >
        Excel exportieren
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
      >
        Als PDF speichern
      </Button>
    </div>
  );
}
