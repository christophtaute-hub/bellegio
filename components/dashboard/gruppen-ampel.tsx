import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { GruppenZeile } from "@/lib/steuerung/lade-steuerung";
import { GRUPPENART_LABEL } from "@/lib/constants";
import { AmpelBadge } from "@/components/team/ampel-badge";
import { cn } from "cn";

const AMPEL_LABELS = { gruen: "In Ordnung", gelb: "Knapp", rot: "Zu wenig" } as const;

const std = (wert: number) => (Math.round(wert * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

function monatKurz(iso: string): string {
  const [jahr, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "short", year: "numeric", timeZone: "UTC" });
}

function personalText(g: GruppenZeile, modell: "bayern" | "bw" | "nrw"): string {
  const p = g.personal;
  if (modell === "nrw" && p.fk && p.ek) {
    return `FK ${std(p.fk.ist)}/${std(p.fk.soll)}${p.ek.soll > 0 ? ` · EK ${std(p.ek.ist)}/${std(p.ek.soll)}` : ""} Std.`;
  }
  if (modell === "bayern" && p.bayern) {
    return `${std(p.istStunden)}/${std(p.sollStunden)} Std.${p.bayern.schluessel ? ` · 1 : ${std(p.bayern.schluessel)}` : ""}`;
  }
  return `${std(p.istStunden)}/${std(p.sollStunden)} Std.`;
}

/** Belegung und Personal je Gruppe in einer Tabelle — jetzt und mit dem ersten Monat, in dem es kritisch wird. Die Zeile
 * führt zur Gruppe. Bayern kennt den Schlüssel gesetzlich nur für die Einrichtung, dort ist der Gruppenwert ein Richtwert. */
export function GruppenAmpel({
  gruppen,
  modell,
  zuordnung,
  stichtagMonat,
}: {
  /** Erster Tag des Monats des gewählten Stichtags (YYYY-MM-01). */
  stichtagMonat: string;
  gruppen: GruppenZeile[];
  modell: "bayern" | "bw" | "nrw";
  zuordnung: { belastbar: boolean; quote: number; ohneGruppeStunden: number };
}) {
  if (gruppen.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5" aria-labelledby="gruppen-titel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="gruppen-titel" className="font-heading text-lg text-primary">
          Gruppen
        </h2>
        {modell === "bayern" ? (
          <p className="text-xs text-muted-foreground">Personal je Gruppe ist ein Richtwert — gesetzlich zählt der Schlüssel der Einrichtung.</p>
        ) : null}
      </div>

      {!zuordnung.belastbar ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Nur {Math.round(zuordnung.quote * 100)} % der Personalstunden sind einer Gruppe zugeordnet — die Personalwerte je Gruppe sind
            deshalb nicht belastbar.{" "}
            <Link href="/team" className="font-medium underline underline-offset-2">
              Personal zuordnen
            </Link>
          </span>
        </p>
      ) : zuordnung.ohneGruppeStunden > 0 ? (
        <p className="text-xs text-muted-foreground">
          {std(zuordnung.ohneGruppeStunden)} Wochenstunden Personal sind keiner Gruppe zugeordnet (Einrichtungsebene) und stehen hier nicht.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Gruppe</th>
              <th className="px-3 py-2 font-medium">Belegung</th>
              <th className="px-3 py-2 font-medium">Personal{modell === "bayern" ? " (Richtwert)" : ""}</th>
              <th className="px-3 py-2 font-medium">Wird kritisch</th>
            </tr>
          </thead>
          <tbody>
            {gruppen.map((g) => {
              const ueber = g.belegt > g.sollplaetze;
              return (
                <tr key={g.gruppeId} className="border-b last:border-0">
                  <td className="py-2.5 pr-3">
                    <Link href={`/gruppen/${g.gruppeId}`} className="font-medium text-primary hover:underline">
                      {g.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{GRUPPENART_LABEL[g.gruppenart] ?? g.gruppenart}</span>
                  </td>
                  <td className={cn("px-3 py-2.5 tabular-nums", ueber && "font-medium text-destructive")}>
                    {g.belegt} / {g.sollplaetze}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {ueber ? `${g.belegt - g.sollplaetze} zu viel` : g.sollplaetze - g.belegt > 0 ? `${g.sollplaetze - g.belegt} frei` : "voll"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {zuordnung.belastbar ? (
                      <div className="flex flex-col items-start gap-1">
                        <AmpelBadge ampel={g.personal.ampel} labels={AMPEL_LABELS} />
                        <span className="text-xs tabular-nums text-muted-foreground">{personalText(g, modell)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {g.kritisch ? (
                      <span className={g.kritisch.ampel === "rot" ? "font-medium text-destructive" : "font-medium text-amber-700 dark:text-amber-400"}>
                        {g.kritisch.monat <= stichtagMonat ? "Jetzt" : `Ab ${monatKurz(g.kritisch.monat)}`}
                        {" · "}
                        {g.kritisch.ampel === "rot" ? "zu wenig Personal" : "knapp"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">nicht absehbar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
