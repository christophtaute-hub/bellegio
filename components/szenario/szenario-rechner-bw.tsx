"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import {
  buildBWPersonalplanung,
  type BWGruppe,
  type BWPersonalschluesselRow,
} from "@/lib/team/personalschluessel-bw";

const BW_BETRIEBSFORM_LABEL: Record<string, string> = {
  halbtagsgruppe: "Halbtagsgruppe",
  regelgruppe: "Regelgruppe",
  verlaengerte_oeffnungszeit: "Verlängerte Öffnungszeit (VÖ)",
  ganztagsgruppe: "Ganztagsgruppe (GT)",
  kinderkrippe: "Kinderkrippe",
};

const AMPEL_LABELS = {
  gruen: "Personalschlüssel erfüllt",
  gelb: "Knapp am Limit",
  rot: "Personalschlüssel nicht erfüllt",
};

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function comboKey(betriebsform: string, altersmischung: boolean) {
  return `${betriebsform}|${altersmischung}`;
}

let nextId = 1;

type GruppeState = {
  id: number;
  name: string;
  betriebsform: string;
  altersmischung: boolean;
  oeffnungszeitStunden: number;
};
type PersonalState = { id: number; wochenstunden: number };

export function SzenarioRechnerBW({
  tabelle,
  initialGruppen,
  initialPersonal,
  vollzeitWochenstunden,
}: {
  tabelle: BWPersonalschluesselRow[];
  initialGruppen: {
    name: string;
    betriebsform: string | null;
    altersmischung: boolean;
    oeffnungszeitStunden: number | null;
  }[];
  initialPersonal: { wochenstunden: number }[];
  vollzeitWochenstunden: number;
}) {
  const ersteZeile = tabelle[0];
  const [gruppen, setGruppen] = useState<GruppeState[]>(
    initialGruppen.map((g) => ({
      id: nextId++,
      name: g.name,
      betriebsform: g.betriebsform ?? ersteZeile?.betriebsform ?? "",
      altersmischung: g.altersmischung,
      oeffnungszeitStunden:
        g.oeffnungszeitStunden ?? ersteZeile?.referenzOeffnungszeitStunden ?? 6,
    }))
  );
  const [personal, setPersonal] = useState<PersonalState[]>(
    initialPersonal.map((p) => ({ ...p, id: nextId++ }))
  );

  const ergebnis = useMemo(() => {
    const bwGruppen: BWGruppe[] = gruppen.map((g) => ({
      id: String(g.id),
      name: g.name,
      bwBetriebsform: g.betriebsform,
      bwAltersmischung: g.altersmischung,
      bwOeffnungszeitStunden: g.oeffnungszeitStunden,
    }));
    const istAzGesamt = personal.reduce((sum, p) => sum + p.wochenstunden, 0);
    return buildBWPersonalplanung(bwGruppen, tabelle, istAzGesamt, vollzeitWochenstunden);
  }, [gruppen, personal, tabelle, vollzeitWochenstunden]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Gruppen</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Betriebsform / Altersmischung</th>
                <th className="p-2 text-right">Öffnungszeit (Std./Tag)</th>
                <th className="p-2 text-right">Soll-VZÄ</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {gruppen.map((g) => {
                const ergebnisZeile = ergebnis.gruppen.find(
                  (e) => e.gruppeId === String(g.id)
                );
                return (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="p-1">
                      <Input
                        className="h-8 w-40"
                        value={g.name}
                        onChange={(e) =>
                          setGruppen((prev) =>
                            prev.map((row) =>
                              row.id === g.id ? { ...row, name: e.target.value } : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-1">
                      <select
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                        value={comboKey(g.betriebsform, g.altersmischung)}
                        onChange={(e) => {
                          const [betriebsform, altersmischungStr] = e.target.value.split("|");
                          const altersmischung = altersmischungStr === "true";
                          const zeile = tabelle.find(
                            (r) =>
                              r.betriebsform === betriebsform &&
                              r.altersmischung === altersmischung
                          );
                          setGruppen((prev) =>
                            prev.map((row) =>
                              row.id === g.id
                                ? {
                                    ...row,
                                    betriebsform,
                                    altersmischung,
                                    oeffnungszeitStunden:
                                      zeile?.referenzOeffnungszeitStunden ??
                                      row.oeffnungszeitStunden,
                                  }
                                : row
                            )
                          );
                        }}
                      >
                        {tabelle.map((r) => (
                          <option
                            key={comboKey(r.betriebsform, r.altersmischung)}
                            value={comboKey(r.betriebsform, r.altersmischung)}
                          >
                            {BW_BETRIEBSFORM_LABEL[r.betriebsform] ?? r.betriebsform}
                            {r.altersmischung ? " (mit Altersmischung)" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        className="h-8 w-24 text-right"
                        value={g.oeffnungszeitStunden}
                        onChange={(e) =>
                          setGruppen((prev) =>
                            prev.map((row) =>
                              row.id === g.id
                                ? {
                                    ...row,
                                    oeffnungszeitStunden: Number(e.target.value) || 0,
                                  }
                                : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {ergebnisZeile ? formatNumber(ergebnisZeile.sollVzae) : "–"}
                    </td>
                    <td className="p-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setGruppen((prev) => prev.filter((row) => row.id !== g.id))
                        }
                      >
                        Entfernen
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() =>
            setGruppen((prev) => [
              ...prev,
              {
                id: nextId++,
                name: `Gruppe ${prev.length + 1}`,
                betriebsform: ersteZeile?.betriebsform ?? "",
                altersmischung: false,
                oeffnungszeitStunden: ersteZeile?.referenzOeffnungszeitStunden ?? 6,
              },
            ])
          }
        >
          Gruppe hinzufügen
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Personal</h2>
        <div className="flex flex-col gap-2">
          {personal.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
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
            setPersonal((prev) => [...prev, { id: nextId++, wochenstunden: 30 }])
          }
        >
          Personal hinzufügen
        </Button>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg text-primary">Ergebnis</h2>
          <AmpelBadge ampel={ergebnis.ampel} labels={AMPEL_LABELS} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Ist-VZÄ gesamt"
            value={formatNumber(ergebnis.istVzaeGesamt)}
            icon={Users}
          />
          <StatTile
            label="Soll-VZÄ gesamt"
            value={formatNumber(ergebnis.sollVzaeGesamt)}
            icon={Users}
            tone={ergebnis.istVzaeGesamt < ergebnis.sollVzaeGesamt ? "warn" : "default"}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Baden-Württemberg kennt keinen Anstellungsschlüssel-Prozentsatz —
          jeder Gruppentyp hat einen festen VZÄ-Sollwert (§1 KiTaVO). Details
          siehe Dokumentation.
        </p>
      </section>
    </div>
  );
}
