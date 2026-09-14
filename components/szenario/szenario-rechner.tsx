"use client";

import { useMemo, useState } from "react";
import { Scale, Users, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { Badge } from "@/components/ui/badge";
import { TEAM_ROLE_CATEGORY_LABEL } from "@/lib/constants";
import {
  buildKpis,
  buildBelegungKennzahlen,
  type PresenceRow,
} from "@/lib/dashboard/presence";
import {
  buildPersonalplanung,
  type TeamPresenceRow,
} from "@/lib/team/anstellungsschluessel";

type BandOption = { id: string; label: string; factor: number };
type CategoryOption = { id: string; code: string; label: string; factor: number };

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

let nextId = 1;

export function SzenarioRechner({
  bands,
  categories,
  initialMatrix,
  initialPersonal,
  initialSollplaetzeSumme,
  initialGruppenAnzahl,
}: {
  bands: BandOption[];
  categories: CategoryOption[];
  initialMatrix: Record<string, Record<string, number>>;
  initialPersonal: { role_category: string; wochenstunden: number }[];
  initialSollplaetzeSumme: number;
  initialGruppenAnzahl: number;
}) {
  const [matrix, setMatrix] = useState(initialMatrix);
  const [personal, setPersonal] = useState(
    initialPersonal.map((p) => ({ ...p, id: nextId++ }))
  );
  const [gruppenAnzahl, setGruppenAnzahl] = useState(initialGruppenAnzahl);
  const [sollplaetzeSumme, setSollplaetzeSumme] = useState(
    initialSollplaetzeSumme
  );

  const { kpis, belegung, personalplanung } = useMemo(() => {
    const rows: PresenceRow[] = [];
    for (const category of categories) {
      for (const band of bands) {
        const count = matrix[category.id]?.[band.id] ?? 0;
        for (let i = 0; i < count; i++) {
          rows.push({
            kind_id: `virtual-${category.id}-${band.id}-${i}`,
            gruppe_id: null,
            buchungszeit_band_id: band.id,
            buchungszeit_label: band.label,
            buchungszeit_factor: band.factor,
            weighting_factor_id: category.id,
            weighting_factor_code: category.code,
            weighting_factor_label: category.label,
            weighting_factor_value: category.factor,
          });
        }
      }
    }

    const teamRows: TeamPresenceRow[] = personal.map((p) => ({
      team_id: String(p.id),
      vorname: null,
      nachname: null,
      rolle: null,
      role_category: p.role_category,
      wochenstunden: p.wochenstunden,
    }));

    const kpis = buildKpis(rows);
    const belegung = buildBelegungKennzahlen(rows, sollplaetzeSumme);
    const personalplanung = buildPersonalplanung(
      teamRows,
      kpis.gewichteteSumme,
      gruppenAnzahl
    );
    return { kpis, belegung, personalplanung };
  }, [matrix, personal, gruppenAnzahl, sollplaetzeSumme, bands, categories]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">
          Belegung (Kinder je Kategorie × Buchungszeit)
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-2 text-left">Kategorie</th>
                {bands.map((band) => (
                  <th key={band.id} className="p-2 text-right">
                    {band.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{category.label}</td>
                  {bands.map((band) => (
                    <td key={band.id} className="p-1 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-16 text-right"
                        value={matrix[category.id]?.[band.id] ?? 0}
                        onChange={(e) => {
                          const value = Math.max(0, Number(e.target.value) || 0);
                          setMatrix((prev) => ({
                            ...prev,
                            [category.id]: {
                              ...prev[category.id],
                              [band.id]: value,
                            },
                          }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Sollplätze gesamt (Betriebserlaubnis)
            </label>
            <Input
              type="number"
              min={0}
              className="h-8 w-32"
              value={sollplaetzeSumme}
              onChange={(e) => setSollplaetzeSumme(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Anzahl Gruppen
            </label>
            <Input
              type="number"
              min={1}
              className="h-8 w-24"
              value={gruppenAnzahl}
              onChange={(e) => setGruppenAnzahl(Number(e.target.value) || 1)}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Personal</h2>
        <div className="flex flex-col gap-2">
          {personal.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                value={p.role_category}
                onChange={(e) =>
                  setPersonal((prev) =>
                    prev.map((row) =>
                      row.id === p.id
                        ? { ...row, role_category: e.target.value }
                        : row
                    )
                  )
                }
              >
                {Object.entries(TEAM_ROLE_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                max={60}
                step={0.5}
                className="h-8 w-24"
                value={p.wochenstunden}
                onChange={(e) =>
                  setPersonal((prev) =>
                    prev.map((row) =>
                      row.id === p.id
                        ? { ...row, wochenstunden: Number(e.target.value) || 0 }
                        : row
                    )
                  )
                }
              />
              <span className="text-sm text-muted-foreground">Std./Woche</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPersonal((prev) => prev.filter((row) => row.id !== p.id))
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() =>
            setPersonal((prev) => [
              ...prev,
              { id: nextId++, role_category: "fk", wochenstunden: 30 },
            ])
          }
        >
          Personal hinzufügen
        </Button>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg text-primary">Ergebnis</h2>
          <AmpelBadge ampel={personalplanung.ampel} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Kinder gesamt"
            value={String(kpis.kinderGesamt)}
            icon={<Users />}
          />
          <MetricCard
            label="Anstellungsschlüssel"
            value={
              personalplanung.anstellungsschluessel !== null
                ? `1 : ${formatNumber(personalplanung.anstellungsschluessel, 2)}`
                : "–"
            }
            icon={<Scale />}
            tone={!personalplanung.mindestschluesselOk ? "warn" : "default"}
          />
          <MetricCard
            label="Ist-FK / Soll-FK"
            value={`${formatNumber(personalplanung.istFk)} / ${formatNumber(personalplanung.sollFk)}`}
            icon={<GraduationCap />}
          />
          <MetricCard
            label="Differenz (Belegt − Sollplätze)"
            value={`${belegung.differenz >= 0 ? "+" : ""}${belegung.differenz}`}
            icon={<Scale />}
            tone={belegung.differenz > 0 ? "warn" : "default"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={personalplanung.mindestschluesselOk ? "secondary" : "destructive"}
          >
            Mindestschlüssel 1:11,0: {personalplanung.mindestschluesselOk ? "Ja" : "Nein"}
          </Badge>
          <Badge
            variant={
              personalplanung.qualifikationsschluesselOk ? "secondary" : "destructive"
            }
          >
            Qualifikationsschlüssel:{" "}
            {personalplanung.qualifikationsschluesselOk ? "Ja" : "Nein"}
          </Badge>
        </div>
      </section>
    </div>
  );
}
