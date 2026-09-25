"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";
import type { KategorisierungsMonat } from "@/lib/controlling/jahreskategorisierung";
import { GRUPPENART_LABEL } from "@/lib/constants";

const MONATSNAMEN = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function buildKategorisierungRows(monate: KategorisierungsMonat[]) {
  const rows: Record<string, string | number>[] = [];
  monate[0].baender.forEach((band, bandIndex) => {
    const kinder = monate.map((m) => m.baender[bandIndex].anzahlKinder);
    const iStatus = monate.map((m) => m.baender[bandIndex].davonMitBehinderung);
    if (!kinder.some((n) => n > 0)) return;
    rows.push({
      Wochenstunden: band.label,
      Art: "Kinder",
      ...Object.fromEntries(MONATSNAMEN.map((name, i) => [name, kinder[i]])),
    });
    rows.push({
      Wochenstunden: band.label,
      Art: "davon I-Status",
      ...Object.fromEntries(MONATSNAMEN.map((name, i) => [name, iStatus[i]])),
    });
  });
  return rows;
}

function formatMonthLabel(month: string): string {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function personalRows(months: ForecastMonth[]): { label: string; values: (string | number)[] }[] {
  const modell = months[0]?.personal.modell;
  const runde = (wert: number, stellen: number) => Number(wert.toFixed(stellen));

  if (modell === "bw") {
    const d = (m: ForecastMonth) => {
      if (m.personal.modell !== "bw") throw new Error("BW-Modell erwartet");
      return m.personal.daten;
    };
    return [
      { label: "Kinderzahl", values: months.map((m) => m.kpis.kinderGesamt) },
      { label: "Ist-VZÄ", values: months.map((m) => runde(d(m).istVzaeGesamt, 2)) },
      { label: "Soll-VZÄ", values: months.map((m) => runde(d(m).sollVzaeGesamt, 2)) },
      { label: "Differenz VZÄ", values: months.map((m) => runde(d(m).istVzaeGesamt - d(m).sollVzaeGesamt, 2)) },
      { label: "Personalschlüssel (KiTaVO)", values: months.map((m) => AMPEL_TEXT[d(m).ampel]) },
    ];
  }

  if (modell === "nrw") {
    const d = (m: ForecastMonth) => {
      if (m.personal.modell !== "nrw") throw new Error("NRW-Modell erwartet");
      return m.personal.daten;
    };
    return [
      { label: "Kinderzahl", values: months.map((m) => m.kpis.kinderGesamt) },
      { label: "Ist-FK (Std.)", values: months.map((m) => runde(d(m).istFk, 1)) },
      { label: "Soll-FK (Std.)", values: months.map((m) => runde(d(m).sollFachkraftStundenGesamt, 1)) },
      { label: "Ist-EK (Std.)", values: months.map((m) => runde(d(m).istEk, 1)) },
      { label: "Soll-EK (Std.)", values: months.map((m) => runde(d(m).sollErgaenzungskraftStundenGesamt, 1)) },
      { label: "Personalstunden (KiBiz)", values: months.map((m) => AMPEL_TEXT[d(m).ampel]) },
    ];
  }

  const d = (m: ForecastMonth) => {
    if (m.personal.modell !== "bayern") throw new Error("Bayern-Modell erwartet");
    return m.personal.daten;
  };
  const gruppenarten = (months[0]?.kpisByGruppenart ?? [])
    .filter((g) => g.gruppenart !== "unbekannt")
    .map((g) => g.gruppenart);
  const gruppenartRows = gruppenarten.flatMap((gruppenart) => {
    const kpisFuer = (m: ForecastMonth) => m.kpisByGruppenart.find((g) => g.gruppenart === gruppenart)?.kpis;
    const label = GRUPPENART_LABEL[gruppenart] ?? gruppenart;
    return [
      { label: `${label}: Ungewichtete Std.`, values: months.map((m) => runde(kpisFuer(m)?.ungewichteteSumme ?? 0, 1)) },
      { label: `${label}: Gewichtete Std.`, values: months.map((m) => runde(kpisFuer(m)?.gewichteteSumme ?? 0, 1)) },
    ];
  });
  return [
    ...gruppenartRows,
    { label: "Ungewichtete Kinderzahl", values: months.map((m) => m.kpis.kinderGesamt) },
    { label: "Gewichtete Kinderzahl", values: months.map((m) => runde(d(m).gewichteteKinderzahl, 1)) },
    { label: "Ist-VZÄ", values: months.map((m) => runde(d(m).vzaeIst, 2)) },
    { label: "Soll-VZÄ", values: months.map((m) => runde(d(m).vzaeSoll, 2)) },
    { label: "Soll-Fachkraft-VZÄ", values: months.map((m) => runde(d(m).vzaeSollFachkraft, 2)) },
    { label: "Ist-FK (Std.)", values: months.map((m) => runde(d(m).istFk, 1)) },
    { label: "Ist-EK (Std.)", values: months.map((m) => runde(d(m).istEk, 1)) },
    { label: "Anstellungsschlüssel (1:X)", values: months.map((m) => d(m).anstellungsschluessel ?? "") },
    { label: "Mindestschlüssel 1:11,0", values: months.map((m) => (d(m).mindestschluesselOk ? "Ja" : "Nein")) },
    { label: "Eigene Zielgröße (nicht gesetzlich)", values: months.map((m) => (d(m).empfohlenerSchluesselOk ? "Ja" : "Nein")) },
    { label: "Qualifikationsschlüssel", values: months.map((m) => (d(m).qualifikationsschluesselOk ? "Ja" : "Nein")) },
  ];
}

const AMPEL_TEXT = { gruen: "Erfüllt", gelb: "Knapp", rot: "Nicht erfüllt" } as const;

function finanzRows(months: ForecastMonth[]): { label: string; values: (string | number)[] }[] {
  const runde = (wert: number, stellen: number) => Number(wert.toFixed(stellen));
  return [
    { label: "Fördererlöse", values: months.map((m) => (m.finanzen ? runde(m.finanzen.foerdererloeseMonat, 2) : "")) },
    { label: "Personalkosten", values: months.map((m) => (m.finanzen ? runde(m.finanzen.personalkostenMonat, 2) : "")) },
    { label: "Ergebnis", values: months.map((m) => (m.finanzen ? runde(m.finanzen.ergebnisMonat, 2) : "")) },
  ];
}

export function buildRows(months: ForecastMonth[], zeigeFinanzen = false) {
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
    ...personalRows(months),
    ...(zeigeFinanzen ? finanzRows(months) : []),
  ];

  return metricRows.map((row) => ({
    Kennzahl: row.label,
    ...Object.fromEntries(
      months.map((m, i) => [formatMonthLabel(m.month), row.values[i]])
    ),
  }));
}

export function ExportButtons({
  months,
  kategorisierung,
  zeigeFinanzen = false,
}: {
  months: ForecastMonth[];
  kategorisierung?: { jahr: number; monate: KategorisierungsMonat[] };
  zeigeFinanzen?: boolean;
}) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const sheet = XLSX.utils.json_to_sheet(buildRows(months, zeigeFinanzen));
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, sheet, "Controlling");
          if (kategorisierung) {
            XLSX.utils.book_append_sheet(
              workbook,
              XLSX.utils.json_to_sheet(buildKategorisierungRows(kategorisierung.monate)),
              `Kategorisierung ${kategorisierung.jahr}`
            );
          }
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
