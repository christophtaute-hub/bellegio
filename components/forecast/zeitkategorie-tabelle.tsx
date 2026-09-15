import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseIsoDate } from "@/lib/kita-datum";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function formatMonthLabel(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const BW_BETRIEBSFORM_LABEL: Record<string, string> = {
  halbtagsgruppe: "Halbtagsgruppe",
  regelgruppe: "Regelgruppe",
  verlaengerte_oeffnungszeit: "Verlängerte Öffnungszeit",
  ganztagsgruppe: "Ganztagsgruppe",
  kinderkrippe: "Kinderkrippe",
};

/** Zeigt je Monat, wie viele Kinder in welcher Zeitkategorie waren — in
 * Bayern pro Kind (Buchungszeit × Gewichtungsfaktor), in Baden-Württemberg
 * und NRW gibt es kein Pro-Kind-Buchungszeit-Konzept, daher stattdessen die
 * Gruppen-Konfiguration (Betriebsform bzw. Gruppenform/Buchungszeit-Band). */
export function ZeitkategorieTabelle({ months }: { months: ForecastMonth[] }) {
  if (months.length === 0) return null;
  const erster = months[0].zeitkategorie;

  if (erster.modell === "bayern") {
    return (
      <div className="flex flex-col gap-4">
        {months.map((m) => {
          const zk = m.zeitkategorie;
          if (zk.modell !== "bayern" || zk.matrix.grandTotal === 0) return null;
          return (
            <div key={m.month} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {formatMonthLabel(m.month)}
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/40">
                      <th className="p-2 text-left">Gewichtungsfaktor</th>
                      {zk.matrix.buchungszeitLabels.map((label) => (
                        <th key={label} className="p-2 text-right">
                          {label}
                        </th>
                      ))}
                      <th className="p-2 text-right font-semibold">Summe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zk.matrix.rows.map((row) => (
                      <tr key={row.weightingLabel} className="border-b last:border-0">
                        <td className="p-2">{row.weightingLabel}</td>
                        {zk.matrix.buchungszeitLabels.map((label) => (
                          <td key={label} className="p-2 text-right tabular-nums">
                            {row.cells[label] || "–"}
                          </td>
                        ))}
                        <td className="p-2 text-right font-medium tabular-nums">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/40 font-semibold">
                      <td className="p-2">Summe</td>
                      {zk.matrix.buchungszeitLabels.map((label) => (
                        <td key={label} className="p-2 text-right tabular-nums">
                          {zk.matrix.columnTotals[label]}
                        </td>
                      ))}
                      <td className="p-2 text-right tabular-nums">
                        {zk.matrix.grandTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // BW/NRW: eine Tabelle, Monate als Spalten, da die Gruppen-Konfiguration
  // aktuell nicht historisiert wird und sich daher über die Monate nicht
  // unterscheidet.
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Die Gruppen-Konfiguration wird aktuell nicht rückwirkend
        gespeichert — angezeigt wird die derzeit hinterlegte Konfiguration
        für jeden Monat im gewählten Zeitraum.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gruppe</TableHead>
              {erster.modell === "bw" ? (
                <>
                  <TableHead>Betriebsform</TableHead>
                  <TableHead>Altersmischung</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Gruppenform</TableHead>
                  <TableHead>Buchungszeit</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {erster.modell === "bw"
              ? erster.gruppen.map((g) => (
                  <TableRow key={g.name}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      {g.betriebsform
                        ? (BW_BETRIEBSFORM_LABEL[g.betriebsform] ?? g.betriebsform)
                        : "nicht konfiguriert"}
                    </TableCell>
                    <TableCell>{g.altersmischung ? "Ja" : "Nein"}</TableCell>
                  </TableRow>
                ))
              : erster.modell === "nrw"
                ? erster.gruppen.map((g) => (
                    <TableRow key={g.name}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{g.gruppenform ?? "nicht konfiguriert"}</TableCell>
                      <TableCell>
                        {g.buchungszeitStunden
                          ? `${g.buchungszeitStunden} Std./Woche`
                          : "–"}
                      </TableCell>
                    </TableRow>
                  ))
                : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
