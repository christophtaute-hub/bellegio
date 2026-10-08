"use client";

import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigations-fortschritt";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { zeitraumQuery, type ZeitraumArt } from "@/lib/controlling/zeitraum";
import { kitajahrLabel } from "@/lib/kita-datum";
import { cn } from "cn";

const ARTEN: { art: Exclude<ZeitraumArt, "frei">; label: string }[] = [
  { art: "kitajahr", label: "Kitajahr" },
  { art: "kalenderjahr", label: "Kalenderjahr" },
  { art: "mehrjahre", label: "Mehrere Jahre" },
];

const SELECT_KLASSE =
  "h-8 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Eine Auswahl für alle Zeiträume: Kitajahr (nach dem Beginn der Einrichtung), Kalenderjahr oder mehrere Jahre (bis 36 Monate). */
export function ZeitraumAuswahl({
  basePath,
  art,
  jahr,
  bisJahr,
  kitajahrBeginnMonat,
  aktuellesJahr,
  beschreibung,
}: {
  basePath: string;
  art: ZeitraumArt;
  jahr: number;
  bisJahr: number;
  kitajahrBeginnMonat: number;
  aktuellesJahr: number;
  /** Ausgeschriebener Zeitraum, z. B. „01.09.2026 – 31.08.2027“. */
  beschreibung: string;
}) {
  const router = useRouter();
  const gewaehlt: Exclude<ZeitraumArt, "frei"> = art === "frei" ? "kitajahr" : art;
  const [neuArt, setNeuArt] = useState(gewaehlt);
  const [neuJahr, setNeuJahr] = useState(jahr);
  const [neuBis, setNeuBis] = useState(Math.max(bisJahr, jahr));

  const jahre = Array.from({ length: aktuellesJahr + 3 - 2020 + 1 }, (_, i) => 2020 + i).reverse();
  const bisOptionen = jahre.filter((j) => j >= neuJahr && j <= neuJahr + 2).reverse();

  function anzeigen(a: Exclude<ZeitraumArt, "frei">, j: number, b: number) {
    startNavigation();
    router.push(`${basePath}?${zeitraumQuery(a, j, Math.min(Math.max(b, j), j + 2))}`);
  }

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-secondary/40 p-0.5" role="group" aria-label="Zeitraum">
          {ARTEN.map((a) => (
            <button
              key={a.art}
              type="button"
              onClick={() => {
                setNeuArt(a.art);
                anzeigen(a.art, neuJahr, neuBis);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                neuArt === a.art ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={neuArt === a.art}
            >
              {a.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {neuArt === "mehrjahre" ? "von" : "Jahr"}
          <select
            className={SELECT_KLASSE}
            value={neuJahr}
            onChange={(e) => {
              const j = Number(e.target.value);
              setNeuJahr(j);
              const b = Math.min(Math.max(neuBis, j), j + 2);
              setNeuBis(b);
              anzeigen(neuArt, j, b);
            }}
          >
            {jahre.map((j) => (
              <option key={j} value={j}>
                {neuArt === "kitajahr" ? kitajahrLabel(j, kitajahrBeginnMonat) : j}
              </option>
            ))}
          </select>
        </label>

        {neuArt === "mehrjahre" ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            bis
            <select
              className={SELECT_KLASSE}
              value={neuBis}
              onChange={(e) => {
                const b = Number(e.target.value);
                setNeuBis(b);
                anzeigen("mehrjahre", neuJahr, b);
              }}
            >
              {bisOptionen.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            startNavigation();
            router.push(basePath);
          }}
          title="Zurück zum laufenden Kitajahr"
        >
          Aktuelles Kitajahr
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{beschreibung}</p>
    </div>
  );
}
