import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ZeitkategorieUebersicht } from "@/components/forecast/zeitkategorie-uebersicht";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

const BW_BETRIEBSFORM_LABEL: Record<string, string> = {
  halbtagsgruppe: "Halbtagsgruppe",
  regelgruppe: "Regelgruppe",
  verlaengerte_oeffnungszeit: "Verlängerte Öffnungszeit (VÖ)",
  ganztagsgruppe: "Ganztagsgruppe (GT)",
  kinderkrippe: "Kinderkrippe",
};

/** Zeigt je Monat, wie viele Kinder in welcher Zeitkategorie waren — in
 * Bayern pro Kind (Buchungszeit × Gewichtungsfaktor). Für Baden-Württemberg
 * und NRW zeigt diese Tabelle noch die Gruppen-Konfiguration (Betriebsform
 * bzw. Gruppenform/Buchungszeit-Band), obwohl dort inzwischen ebenfalls
 * Pro-Kind-Bänder erfasst werden (siehe Kalenderjahr-Kategorisierung). */
export function ZeitkategorieTabelle({ months }: { months: ForecastMonth[] }) {
  if (months.length === 0) return null;
  const erster = months[0].zeitkategorie;

  if (erster.modell === "bayern") {
    const sichtbareMonate = months
      .filter((m) => m.zeitkategorie.modell === "bayern" && m.zeitkategorie.matrix.grandTotal > 0)
      .map((m) => ({ month: m.month, matrix: (m.zeitkategorie as Extract<typeof m.zeitkategorie, { modell: "bayern" }>).matrix }));
    if (sichtbareMonate.length === 0) return null;

    return <ZeitkategorieUebersicht monate={sichtbareMonate} />;
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
                    <TableCell>
                      <Badge variant={g.altersmischung ? "secondary" : "outline"}>
                        {g.altersmischung ? "Ja" : "Nein"}
                      </Badge>
                    </TableCell>
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
