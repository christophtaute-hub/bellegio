import { Users, GraduationCap } from "lucide-react";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { NRWPersonalplanung } from "@/lib/team/personalschluessel-nrw";

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const AMPEL_LABELS = {
  gruen: "Personalstunden erfüllt",
  gelb: "Teilweise erfüllt",
  rot: "Personalstunden nicht erfüllt",
};

export function PersonalplanungNRW({
  daten,
  stichtag,
  basePath,
}: {
  daten: NRWPersonalplanung;
  stichtag: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg text-primary">
          Personalstunden (Nordrhein-Westfalen)
        </h2>
        <AmpelBadge ampel={daten.ampel} labels={AMPEL_LABELS} />
      </div>

      <StichtagPicker basePath={basePath} stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Ist-FK / Soll-FK"
          value={`${formatNumber(daten.istFk)} / ${formatNumber(daten.sollFachkraftStundenGesamt)} Std.`}
          icon={GraduationCap}
          tone={daten.istFk < daten.sollFachkraftStundenGesamt ? "warn" : "default"}
        />
        <StatTile
          label="Ist-EK / Soll-EK"
          value={`${formatNumber(daten.istEk)} / ${formatNumber(daten.sollErgaenzungskraftStundenGesamt)} Std.`}
          icon={Users}
          tone={
            daten.istEk < daten.sollErgaenzungskraftStundenGesamt ? "warn" : "default"
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        NRW kennt keinen Anstellungsschlüssel — feste Personalstunden je
        Gruppenform (I/II/III) und Buchungszeit-Band (Anlage zu §33 KiBiz),
        inkl. Leitungsfreistellung. Details siehe Dokumentation.
      </p>

      {daten.gruppen.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-2 text-left">Gruppe</th>
                <th className="p-2 text-left">Gruppenform</th>
                <th className="p-2 text-right">Soll-FK-Std.</th>
                <th className="p-2 text-right">Soll-EK-Std.</th>
              </tr>
            </thead>
            <tbody>
              {daten.gruppen.map((g) => (
                <tr key={g.gruppeId} className="border-b last:border-0">
                  <td className="p-2 font-medium">{g.gruppeName}</td>
                  <td className="p-2 text-muted-foreground">
                    {g.gruppenform ?? "nicht konfiguriert"}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(g.sollFachkraftStunden)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(g.sollErgaenzungskraftStunden)}
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
