import { Scale, GraduationCap, Users } from "lucide-react";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { StatTile } from "@/components/ui/stat-tile";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { Badge } from "@/components/ui/badge";
import type { Personalplanung } from "@/lib/team/anstellungsschluessel";

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function PersonalplanungBayern({
  personal,
  stichtag,
  basePath,
}: {
  personal: Personalplanung;
  stichtag: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg text-primary">
          Anstellungsschlüssel (Bayern)
        </h2>
        <AmpelBadge ampel={personal.ampel} />
      </div>

      <StichtagPicker basePath={basePath} stichtag={stichtag} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Anstellungsschlüssel"
          value={
            personal.anstellungsschluessel !== null
              ? `1 : ${formatNumber(personal.anstellungsschluessel, 2)}`
              : "–"
          }
          icon={Scale}
          tone={!personal.mindestschluesselOk ? "warn" : "default"}
        />
        <StatTile
          label="Ist-FK-VZÄ / Soll-FK-VZÄ"
          value={`${formatNumber(personal.istFk / (personal.vollzeitWochenstunden || 1), 2)} / ${formatNumber(personal.vzaeSollFachkraft, 2)}`}
          icon={Users}
        />
        <StatTile
          label="Ist-EK"
          value={`${formatNumber(personal.istEk, 1)} Std.`}
          icon={GraduationCap}
        />
        <StatTile
          label="Ist-VZÄ gesamt"
          value={formatNumber(personal.vzaeIst, 2)}
          icon={Scale}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={personal.mindestschluesselOk ? "secondary" : "destructive"}>
          Mindestschlüssel 1:11,0: {personal.mindestschluesselOk ? "Ja" : "Nein"}
        </Badge>
        <Badge variant={personal.empfohlenerSchluesselOk ? "secondary" : "destructive"}>
          Eigene Zielgröße (nicht gesetzlich) 1:
          {formatNumber(personal.empfohlenerSchluesselWert, 1)}:{" "}
          {personal.empfohlenerSchluesselOk ? "Ja" : "Nein"}
        </Badge>
        <Badge
          variant={personal.qualifikationsschluesselOk ? "secondary" : "destructive"}
        >
          Qualifikationsschlüssel: {personal.qualifikationsschluesselOk ? "Ja" : "Nein"}
        </Badge>
      </div>
    </div>
  );
}
