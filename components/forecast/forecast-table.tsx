import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { parseIsoDate } from "@/lib/kita-datum";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";

function formatMonthLabel(month: string): string {
  return parseIsoDate(month).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatSchluessel(wert: number | null): string {
  return wert !== null ? `1 : ${formatNumber(wert, 2)}` : "–";
}

function JaNeinBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "secondary" : "destructive"}>
      {ok ? "Ja" : "Nein"}
    </Badge>
  );
}

type Zeitreihe = ForecastMonth[];

function bayernDaten(m: ForecastMonth) {
  if (m.personal.modell !== "bayern") throw new Error("Bayern-Modell erwartet");
  return m.personal.daten;
}
function bwDaten(m: ForecastMonth) {
  if (m.personal.modell !== "bw") throw new Error("BW-Modell erwartet");
  return m.personal.daten;
}
function nrwDaten(m: ForecastMonth) {
  if (m.personal.modell !== "nrw") throw new Error("NRW-Modell erwartet");
  return m.personal.daten;
}

const AMPEL_LABELS = { gruen: "Erfüllt", gelb: "Knapp", rot: "Nicht erfüllt" };

function LabelCell({ children, stark = false }: { children: React.ReactNode; stark?: boolean }) {
  return (
    <TableCell className={cn("sticky left-0 z-10 font-medium", stark ? "bg-secondary font-semibold" : "bg-card")}>
      {children}
    </TableCell>
  );
}

/** Personal-Zeilen je Bundesland: Bayern rechnet mit dem Anstellungsschlüssel,
 * Baden-Württemberg mit VZÄ-Sollwerten je Betriebsform, NRW mit Fachkraft- und
 * Ergänzungskraft-Stunden je Gruppenform — die Tabelle zeigt nur den jeweils
 * passenden Rechenweg. */
function PersonalZeilen({ months }: { months: Zeitreihe }) {
  const modell = months[0]?.personal.modell;

  if (modell === "bw") {
    return (
      <>
        <TableRow>
          <LabelCell>Ist-VZÄ / Soll-VZÄ</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {formatNumber(bwDaten(m).istVzaeGesamt, 2)} / {formatNumber(bwDaten(m).sollVzaeGesamt, 2)}
            </TableCell>
          ))}
        </TableRow>
        <TableRow className="bg-secondary/40">
          <LabelCell stark>Differenz VZÄ (Ist − Soll)</LabelCell>
          {months.map((m) => {
            const diff = bwDaten(m).istVzaeGesamt - bwDaten(m).sollVzaeGesamt;
            return (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {diff >= 0 ? "+" : ""}
                {formatNumber(diff, 2)}
              </TableCell>
            );
          })}
        </TableRow>
        <TableRow>
          <LabelCell>Personalschlüssel (KiTaVO)</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right">
              <AmpelBadge ampel={bwDaten(m).ampel} labels={AMPEL_LABELS} />
            </TableCell>
          ))}
        </TableRow>
      </>
    );
  }

  if (modell === "nrw") {
    return (
      <>
        <TableRow>
          <LabelCell>Ist-FK / Soll-FK (Std./Woche)</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {formatNumber(nrwDaten(m).istFk)} / {formatNumber(nrwDaten(m).sollFachkraftStundenGesamt)}
            </TableCell>
          ))}
        </TableRow>
        <TableRow>
          <LabelCell>Ist-EK / Soll-EK (Std./Woche)</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {formatNumber(nrwDaten(m).istEk)} / {formatNumber(nrwDaten(m).sollErgaenzungskraftStundenGesamt)}
            </TableCell>
          ))}
        </TableRow>
        <TableRow className="bg-secondary/40">
          <LabelCell stark>Differenz Fachkraft-Std.</LabelCell>
          {months.map((m) => {
            const diff = nrwDaten(m).istFk - nrwDaten(m).sollFachkraftStundenGesamt;
            return (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {diff >= 0 ? "+" : ""}
                {formatNumber(diff)}
              </TableCell>
            );
          })}
        </TableRow>
        <TableRow>
          <LabelCell>Personalstunden (KiBiz)</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right">
              <AmpelBadge ampel={nrwDaten(m).ampel} labels={AMPEL_LABELS} />
            </TableCell>
          ))}
        </TableRow>
      </>
    );
  }

  return (
    <>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Gewichtete Kinderzahl
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(bayernDaten(m).gewichteteKinderzahl)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-VZÄ / Soll-VZÄ
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(bayernDaten(m).vzaeIst, 2)} / {formatNumber(bayernDaten(m).vzaeSoll, 2)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-FK-VZÄ / Soll-FK-VZÄ
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(bayernDaten(m).istFk / (bayernDaten(m).vollzeitWochenstunden || 1), 2)}{" "}
                / {formatNumber(bayernDaten(m).vzaeSollFachkraft, 2)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Ist-AZ gesamt (FK+EK)
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {formatNumber(bayernDaten(m).istAzGesamt)} Std.
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-secondary/40">
            <TableCell className="sticky left-0 z-10 bg-secondary/40 font-semibold">
              Anstellungsschlüssel
            </TableCell>
            {months.map((m) => (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  bayernDaten(m).mindestschluesselOk
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {formatSchluessel(bayernDaten(m).anstellungsschluessel)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Mindestschlüssel 1:11,0
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={bayernDaten(m).mindestschluesselOk} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Eigene Zielgröße (nicht gesetzlich)
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={bayernDaten(m).empfohlenerSchluesselOk} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Qualifikationsschlüssel
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <JaNeinBadge ok={bayernDaten(m).qualifikationsschluesselOk} />
              </TableCell>
            ))}
          </TableRow>
    </>
  );
}

export function ForecastTable({ months }: { months: ForecastMonth[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">
              Kennzahl
            </TableHead>
            {months.map((m) => (
              <TableHead key={m.month} className="text-right whitespace-nowrap">
                {formatMonthLabel(m.month)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Belegte Plätze ohne I-Kind
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.belegteOhneI}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Belegte Plätze mit I-Kind
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.belegteMitI}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card font-medium">
              Plätze nach Betriebserlaubnis
            </TableCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums">
                {m.belegung.plaetzeNachBetriebserlaubnis}
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-secondary/40">
            <TableCell className="sticky left-0 z-10 bg-secondary/40 font-semibold">
              Differenz (+/-)
            </TableCell>
            {months.map((m) => (
              <TableCell
                key={m.month}
                className={cn(
                  "text-right font-semibold tabular-nums",
                  m.belegung.differenz >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {m.belegung.differenz >= 0 ? "+" : ""}
                {m.belegung.differenz}
              </TableCell>
            ))}
          </TableRow>

          <PersonalZeilen months={months} />
        </TableBody>
      </Table>
    </div>
  );
}
