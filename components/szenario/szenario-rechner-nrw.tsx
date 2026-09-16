"use client";

import { useMemo, useState } from "react";
import { Users, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import {
  buildNRWPersonalplanung,
  type NRWGruppe,
  type NRWPersonalstundenRow,
} from "@/lib/team/personalschluessel-nrw";

const AMPEL_LABELS = {
  gruen: "Personalstunden erfüllt",
  gelb: "Teilweise erfüllt",
  rot: "Personalstunden nicht erfüllt",
};

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function comboKey(gruppenform: string, buchungszeitStunden: number) {
  return `${gruppenform}|${buchungszeitStunden}`;
}

let nextId = 1;

type GruppeState = {
  id: number;
  name: string;
  gruppenform: string;
  buchungszeitStunden: number;
};
type PersonalState = { id: number; roleCategory: "fk" | "ek"; wochenstunden: number };

export function SzenarioRechnerNRW({
  tabelle,
  initialGruppen,
  initialPersonal,
}: {
  tabelle: NRWPersonalstundenRow[];
  initialGruppen: {
    name: string;
    gruppenform: string | null;
    buchungszeitStunden: number | null;
  }[];
  initialPersonal: { roleCategory: "fk" | "ek"; wochenstunden: number }[];
}) {
  const ersteZeile = tabelle[0];
  const [gruppen, setGruppen] = useState<GruppeState[]>(
    initialGruppen.map((g) => ({
      id: nextId++,
      name: g.name,
      gruppenform: g.gruppenform ?? ersteZeile?.gruppenform ?? "I",
      buchungszeitStunden: g.buchungszeitStunden ?? ersteZeile?.buchungszeitStunden ?? 35,
    }))
  );
  const [personal, setPersonal] = useState<PersonalState[]>(
    initialPersonal.map((p) => ({ ...p, id: nextId++ }))
  );

  const ergebnis = useMemo(() => {
    const nrwGruppen: NRWGruppe[] = gruppen.map((g) => ({
      id: String(g.id),
      name: g.name,
      nrwGruppenform: g.gruppenform,
      nrwBuchungszeitStunden: g.buchungszeitStunden,
    }));
    const istFk = personal
      .filter((p) => p.roleCategory === "fk")
      .reduce((sum, p) => sum + p.wochenstunden, 0);
    const istEk = personal
      .filter((p) => p.roleCategory === "ek")
      .reduce((sum, p) => sum + p.wochenstunden, 0);
    return buildNRWPersonalplanung(nrwGruppen, tabelle, istFk, istEk);
  }, [gruppen, personal, tabelle]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Gruppen</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Gruppenform / Buchungszeit</th>
                <th className="p-2 text-right">Soll-FK-Std.</th>
                <th className="p-2 text-right">Soll-EK-Std.</th>
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
                        value={comboKey(g.gruppenform, g.buchungszeitStunden)}
                        onChange={(e) => {
                          const [gruppenform, stundenStr] = e.target.value.split("|");
                          setGruppen((prev) =>
                            prev.map((row) =>
                              row.id === g.id
                                ? {
                                    ...row,
                                    gruppenform,
                                    buchungszeitStunden: Number(stundenStr),
                                  }
                                : row
                            )
                          );
                        }}
                      >
                        {tabelle.map((r) => (
                          <option
                            key={comboKey(r.gruppenform, r.buchungszeitStunden)}
                            value={comboKey(r.gruppenform, r.buchungszeitStunden)}
                          >
                            GF {r.gruppenform} — {r.buchungszeitStunden} Std./Wo.
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {ergebnisZeile ? formatNumber(ergebnisZeile.sollFachkraftStunden) : "–"}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {ergebnisZeile
                        ? formatNumber(ergebnisZeile.sollErgaenzungskraftStunden)
                        : "–"}
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
                gruppenform: ersteZeile?.gruppenform ?? "I",
                buchungszeitStunden: ersteZeile?.buchungszeitStunden ?? 35,
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
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                value={p.roleCategory}
                onChange={(e) =>
                  setPersonal((prev) =>
                    prev.map((row) =>
                      row.id === p.id
                        ? { ...row, roleCategory: e.target.value as "fk" | "ek" }
                        : row
                    )
                  )
                }
              >
                <option value="fk">Fachkraft</option>
                <option value="ek">Ergänzungskraft</option>
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
              { id: nextId++, roleCategory: "fk", wochenstunden: 30 },
            ])
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
            label="Ist-FK / Soll-FK"
            value={`${formatNumber(ergebnis.istFk)} / ${formatNumber(ergebnis.sollFachkraftStundenGesamt)} Std.`}
            icon={GraduationCap}
            tone={ergebnis.istFk < ergebnis.sollFachkraftStundenGesamt ? "warn" : "default"}
          />
          <StatTile
            label="Ist-EK / Soll-EK"
            value={`${formatNumber(ergebnis.istEk)} / ${formatNumber(ergebnis.sollErgaenzungskraftStundenGesamt)} Std.`}
            icon={Users}
            tone={
              ergebnis.istEk < ergebnis.sollErgaenzungskraftStundenGesamt
                ? "warn"
                : "default"
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          NRW kennt keinen Anstellungsschlüssel — feste Personalstunden je
          Gruppenform (I/II/III) und Buchungszeit-Band (Anlage zu §33 KiBiz),
          inkl. Leitungsfreistellung. Details siehe Dokumentation.
        </p>
      </section>
    </div>
  );
}
