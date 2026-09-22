"use client";

import { useState } from "react";
import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseIsoDate } from "@/lib/kita-datum";
import { buildZeitkategorieUebersicht, type ZeitkategorieMonatEintrag } from "@/lib/forecast/zeitkategorie-uebersicht";
import type { CompositionMatrix } from "@/lib/dashboard/presence";

function formatMonthKurz(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function formatMonthLang(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Buchungszeit × Gewichtungsfaktor für genau einen Monat — der bisherige Tabelleninhalt je Accordion-Eintrag,
 * jetzt nur für den gerade ausgewählten Monat gerendert. */
function DetailMatrix({ matrix }: { matrix: CompositionMatrix }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-secondary/40">
            <th className="p-2 text-left">Gewichtungsfaktor</th>
            {matrix.buchungszeitLabels.map((label) => (
              <th key={label} className="p-2 text-right">
                {label}
              </th>
            ))}
            <th className="p-2 text-right font-semibold">Summe</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.weightingLabel} className="border-b last:border-0">
              <td className="p-2">{row.weightingLabel}</td>
              {matrix.buchungszeitLabels.map((label) => (
                <td key={label} className="p-2 text-right tabular-nums">
                  {row.cells[label] || "–"}
                </td>
              ))}
              <td className="p-2 text-right font-medium tabular-nums">{row.total}</td>
            </tr>
          ))}
          <tr className="bg-secondary/40 font-semibold">
            <td className="p-2">Summe</td>
            {matrix.buchungszeitLabels.map((label) => (
              <td key={label} className="p-2 text-right tabular-nums">
                {matrix.columnTotals[label]}
              </td>
            ))}
            <td className="p-2 text-right tabular-nums">{matrix.grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Zeitkategorie je Monat (Bayern): oben eine kompakte 12-Monats-Übersicht (Zeilen = Gewichtungsfaktor,
 * Spalten = Monate), darunter die Buchungszeit-Aufschlüsselung für genau den ausgewählten Monat — ein Klick auf
 * eine Monatsspalte springt dorthin, statt wie zuvor alle Monate als Accordion untereinander zu zeigen. */
export function ZeitkategorieUebersicht({ monate }: { monate: ZeitkategorieMonatEintrag[] }) {
  const [ausgewaehlt, setAusgewaehlt] = useState(monate[0]?.month ?? null);
  if (monate.length === 0) return null;

  const uebersicht = buildZeitkategorieUebersicht(monate);
  const aktuellerMonat = monate.find((m) => m.month === ausgewaehlt) ?? monate[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Gewichtungsfaktor</TableHead>
              {monate.map((m) => (
                <TableHead key={m.month} className="p-0 text-right">
                  <button
                    type="button"
                    onClick={() => setAusgewaehlt(m.month)}
                    className={cn(
                      "w-full px-3 py-2 text-right transition-colors hover:bg-secondary",
                      m.month === aktuellerMonat.month && "bg-primary font-semibold text-primary-foreground hover:bg-primary"
                    )}
                    aria-current={m.month === aktuellerMonat.month}
                  >
                    {formatMonthKurz(m.month)}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {uebersicht.zeilen.map((zeile) => (
              <TableRow key={zeile.weightingLabel}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">{zeile.weightingLabel}</TableCell>
                {zeile.kinderProMonat.map((n, i) => (
                  <TableCell
                    key={monate[i].month}
                    className={cn("text-right tabular-nums", monate[i].month === aktuellerMonat.month && "bg-secondary/40")}
                  >
                    {n || "–"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="bg-secondary/40 font-semibold">
              <TableCell className="sticky left-0 z-10 bg-secondary font-semibold">Summe</TableCell>
              {uebersicht.summeProMonat.map((n, i) => (
                <TableCell key={monate[i].month} className="text-right tabular-nums">
                  {n}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">{formatMonthLang(aktuellerMonat.month)} im Detail</p>
        <DetailMatrix matrix={aktuellerMonat.matrix} />
      </div>
    </div>
  );
}
