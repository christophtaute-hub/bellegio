import { Users } from "lucide-react";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { BWPersonalplanung } from "@/lib/team/personalschluessel-bw";

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const AMPEL_LABELS = {
  gruen: "Personalschlüssel erfüllt",
  gelb: "Knapp am Limit",
  rot: "Personalschlüssel nicht erfüllt",
};

export function PersonalplanungBW({
  daten,
  stichtag,
  basePath,
}: {
  daten: BWPersonalplanung;
  stichtag: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg text-primary">
          Personalschlüssel (Baden-Württemberg)
        </h2>
        <AmpelBadge ampel={daten.ampel} labels={AMPEL_LABELS} />
      </div>

      <StichtagPicker basePath={basePath} stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Ist-VZÄ gesamt"
          value={formatNumber(daten.istVzaeGesamt)}
          icon={Users}
        />
        <StatTile
          label="Soll-VZÄ gesamt"
          value={formatNumber(daten.sollVzaeGesamt)}
          icon={Users}
          tone={daten.istVzaeGesamt < daten.sollVzaeGesamt ? "warn" : "default"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Baden-Württemberg kennt keinen Anstellungsschlüssel-Prozentsatz —
        jeder Gruppentyp hat einen festen VZÄ-Sollwert (§1 KiTaVO). Details
        siehe Dokumentation.
      </p>

      {daten.gruppen.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-2 text-left">Gruppe</th>
                <th className="p-2 text-left">Betriebsform</th>
                <th className="p-2 text-right">Soll-VZÄ</th>
              </tr>
            </thead>
            <tbody>
              {daten.gruppen.map((g) => (
                <tr key={g.gruppeId} className="border-b last:border-0">
                  <td className="p-2 font-medium">{g.gruppeName}</td>
                  <td className="p-2 text-muted-foreground">
                    {g.betriebsform ?? "nicht konfiguriert"}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(g.sollVzae)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
