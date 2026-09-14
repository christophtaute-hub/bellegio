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
      label: "Buchungen gew.",
      values: months.map((m) => Number(m.personal.buchungenGew.toFixed(1))),
    },
    { label: "Soll-FK", values: months.map((m) => Number(m.personal.sollFk.toFixed(1))) },
    { label: "Ist-FK", values: months.map((m) => Number(m.personal.istFk.toFixed(1))) },
    { label: "Ist-EK", values: months.map((m) => Number(m.personal.istEk.toFixed(1))) },
    {
      label: "Anstellungsschlüssel (1:X)",
      values: months.map((m) => m.personal.anstellungsschluessel ?? ""),
    },
    {
      label: "Mindestschlüssel 1:11,0",
      values: months.map((m) => (m.personal.mindestschluesselOk ? "Ja" : "Nein")),
    },
    {
      label: "Empfohlener Schlüssel 1:10",
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
