import { ergebnisHinweis } from "@/lib/finanzen/hinweise";
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
import { GRUPPENART_LABEL } from "@/lib/constants";
import type { ForecastMonth } from "@/lib/forecast/monthly-forecast";
import { personalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import { belegungStatus } from "@/lib/ui/status";

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
          <LabelCell>Kinderzahl</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {formatNumber(m.kpis.kinderGesamt, 0)}
            </TableCell>
          ))}
        </TableRow>
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
              <AmpelBadge ampel={bwDaten(m).ampel} />
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
          <LabelCell>Kinderzahl</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {formatNumber(m.kpis.kinderGesamt, 0)}
            </TableCell>
          ))}
        </TableRow>
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
              <AmpelBadge ampel={nrwDaten(m).ampel} />
            </TableCell>
          ))}
        </TableRow>
      </>
    );
  }

  // Welche Gruppenarten (Krippe/Kindergarten/…) über den Zeitraum vorkommen, anhand des
  // ersten Monats — spätere Monate lesen denselben Satz an Zeilen, fehlende Werte werden 0.
  const gruppenarten = (months[0]?.kpisByGruppenart ?? [])
    .filter((g) => g.gruppenart !== "unbekannt")
    .map((g) => g.gruppenart);
  const gruppenartKpis = (m: ForecastMonth, gruppenart: string) =>
    m.kpisByGruppenart.find((g) => g.gruppenart === gruppenart)?.kpis;

  return (
    <>
          <AbschnittKopf spalten={months.length + 1} titel="Kinder (Kopfzahl)" />
          {gruppenarten.length > 1
            ? gruppenarten.map((gruppenart) => (
                <TableRow key={`kopf-${gruppenart}`}>
                  <LabelCell>{GRUPPENART_LABEL[gruppenart] ?? gruppenart}</LabelCell>
                  {months.map((m) => (
                    <TableCell key={m.month} className="text-right tabular-nums">
                      {formatNumber(gruppenartKpis(m, gruppenart)?.kinderGesamt ?? 0, 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          <TableRow>
            <LabelCell stark>Kinder gesamt</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right font-semibold tabular-nums">
                {formatNumber(m.kpis.kinderGesamt, 0)}
              </TableCell>
            ))}
          </TableRow>

          <AbschnittKopf spalten={months.length + 1} titel="Buchungsstunden ungewichtet" hinweis="Summe der Buchungszeitfaktoren (z. B. 7–8 Std. = 2,0)" />
          {gruppenarten.length > 1
            ? gruppenarten.map((gruppenart) => (
                <TableRow key={`ung-${gruppenart}`}>
                  <LabelCell>{GRUPPENART_LABEL[gruppenart] ?? gruppenart}</LabelCell>
                  {months.map((m) => (
                    <TableCell key={m.month} className="text-right tabular-nums">
                      {formatNumber(gruppenartKpis(m, gruppenart)?.ungewichteteSumme ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          <TableRow>
            <LabelCell stark>Gesamt ungewichtet</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right font-semibold tabular-nums">
                {formatNumber(m.kpis.ungewichteteSumme)}
              </TableCell>
            ))}
          </TableRow>

          <AbschnittKopf spalten={months.length + 1} titel="Buchungsstunden gewichtet" hinweis="zusätzlich × Gewichtungsfaktor (z. B. unter 3 Jahre = 2,0) — Grundlage der staatlichen Förderung" />
          {gruppenarten.length > 1
            ? gruppenarten.map((gruppenart) => (
                <TableRow key={`gew-${gruppenart}`}>
                  <LabelCell>{GRUPPENART_LABEL[gruppenart] ?? gruppenart}</LabelCell>
                  {months.map((m) => (
                    <TableCell key={m.month} className="text-right tabular-nums">
                      {formatNumber(gruppenartKpis(m, gruppenart)?.gewichteteSumme ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          <TableRow>
            <LabelCell stark>Gesamt gewichtet</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right font-semibold tabular-nums">
                {formatNumber(m.kpis.gewichteteSumme)}
              </TableCell>
            ))}
          </TableRow>

          <AbschnittKopf spalten={months.length + 1} titel="Personal und Anstellungsschlüssel" hinweis="Grundlage ist die gewichtete Kinderzahl (nur Gewichtungsfaktoren, ohne Buchungszeit)" />
          <TableRow>
            <LabelCell>Gewichtete Kinderzahl</LabelCell>
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

function AbschnittKopf({ spalten, titel, hinweis }: { spalten: number; titel: string; hinweis?: string }) {
  return (
    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
      <TableCell className="sticky left-0 z-10 bg-secondary py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titel}
      </TableCell>
      <TableCell colSpan={spalten - 1} className="py-1.5 text-xs text-muted-foreground">
        {hinweis ?? ""}
      </TableCell>
    </TableRow>
  );
}

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

/** Fördererlöse/Personalkosten/Ergebnis — nur gerendert, wenn der Aufrufer Finanzen-Zugriff hat
 * (siehe zeigeFinanzen-Prop von ForecastTable); komplett weggelassen statt leer/blass dargestellt,
 * damit "sieht alles außer Finanzsicht" auch optisch stimmt. */
function FinanzenZeilen({ months }: { months: Zeitreihe }) {
  const nichtErfasstMax = Math.max(0, ...months.map((m) => m.finanzen?.personalkostenNichtErfasst ?? 0));
  const mitBeitraegen = months.some((m) => m.finanzen?.elternbeitraegeMonat !== null && m.finanzen?.elternbeitraegeMonat !== undefined);

  return (
    <>
      <TableRow>
        <LabelCell>Fördererlöse</LabelCell>
        {months.map((m) => (
          <TableCell key={m.month} className="text-right tabular-nums">
            {m.finanzen ? formatEuro(m.finanzen.foerdererloeseMonat) : "–"}
          </TableCell>
        ))}
      </TableRow>
      {mitBeitraegen ? (
        <TableRow>
          <LabelCell>Elternbeiträge</LabelCell>
          {months.map((m) => (
            <TableCell key={m.month} className="text-right tabular-nums">
              {m.finanzen?.elternbeitraegeMonat != null ? formatEuro(m.finanzen.elternbeitraegeMonat) : "–"}
            </TableCell>
          ))}
        </TableRow>
      ) : null}
      <TableRow>
        <LabelCell>Personalkosten</LabelCell>
        {months.map((m) => (
          <TableCell key={m.month} className="text-right tabular-nums">
            {m.finanzen ? formatEuro(m.finanzen.personalkostenMonat) : "–"}
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="bg-secondary/40">
        <LabelCell stark>Ergebnis</LabelCell>
        {months.map((m) => {
          const ergebnis = m.finanzen?.ergebnisMonat;
          return (
            <TableCell
              key={m.month}
              className={cn(
                "text-right font-semibold tabular-nums",
                ergebnis !== undefined && ergebnis >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
              )}
            >
              {ergebnis !== undefined ? formatEuro(ergebnis) : "–"}
            </TableCell>
          );
        })}
      </TableRow>
      <TableRow>
        <TableCell colSpan={months.length + 1} className="sticky left-0 z-10 bg-card text-xs text-muted-foreground">
          <div className="max-w-3xl whitespace-normal">{ergebnisHinweis(mitBeitraegen)}</div>
        </TableCell>
      </TableRow>
      {nichtErfasstMax > 0 ? (
        <TableRow>
          <TableCell colSpan={months.length + 1} className="sticky left-0 z-10 bg-card text-xs text-muted-foreground">
            <div className="max-w-3xl whitespace-normal">Bis zu {nichtErfasstMax} Mitarbeitende ohne erfasste Vergütung — fließen nicht in die Personalkosten ein.</div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function ForecastTable({ months, zeigeFinanzen = false }: { months: ForecastMonth[]; zeigeFinanzen?: boolean }) {
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
          {zeigeFinanzen ? <FinanzenZeilen months={months} /> : null}
        </TableBody>
      </Table>
    </div>
  );
}

/** Die Kurzfassung für den Alltag: Kinder, Plätze, Personal (Ampel + Kennzahl) und — mit Recht — das Ergebnis. Alle weiteren
 * Zeilen (Gruppenarten, gewichtete Stunden, Fachkraft-Aufteilung …) stehen in der vollständigen Tabelle. */
export function ForecastKompakt({ months, zeigeFinanzen = false }: { months: ForecastMonth[]; zeigeFinanzen?: boolean }) {
  const kennzahl = months[0] ? personalKennzahl(months[0].personal).label : "Personal";
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">Monat</TableHead>
            {months.map((m) => (
              <TableHead key={m.month} className="text-right whitespace-nowrap">
                {formatMonthLabel(m.month)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <LabelCell stark>Kinder</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums font-medium">
                {m.kpis.kinderGesamt}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <LabelCell>Plätze</LabelCell>
            {months.map((m) => {
              const status = belegungStatus(m.kpis.kinderGesamt, m.belegung.plaetzeNachBetriebserlaubnis);
              return (
                <TableCell key={m.month} className={cn("text-right tabular-nums", status.ton === "zuviel" && "font-medium text-destructive")}>
                  {m.belegung.plaetzeNachBetriebserlaubnis}
                  <span className="block text-[11px] font-normal text-muted-foreground">{status.wort}</span>
                </TableCell>
              );
            })}
          </TableRow>
          <TableRow>
            <LabelCell stark>Personal</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right">
                <AmpelBadge ampel={m.personal.daten.ampel} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <LabelCell>{kennzahl}</LabelCell>
            {months.map((m) => (
              <TableCell key={m.month} className="text-right tabular-nums text-muted-foreground">
                {personalKennzahl(m.personal).value}
              </TableCell>
            ))}
          </TableRow>
          {zeigeFinanzen ? <FinanzenZeilen months={months} /> : null}
        </TableBody>
      </Table>
    </div>
  );
}
