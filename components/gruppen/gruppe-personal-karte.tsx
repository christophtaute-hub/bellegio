import Link from "next/link";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { GruppeStatus } from "@/lib/steuerung/gruppen-status";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

const AMPEL_LABELS = { gruen: "In Ordnung", gelb: "Knapp", rot: "Zu wenig" } as const;

const std = (wert: number) => (Math.round(wert * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

function monatLang(iso: string): string {
  const [jahr, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export type GruppenPerson = { id: string; name: string; wochenstunden: number; kategorie: string | null };

/** Personal dieser Gruppe auf einen Blick: Ist gegen Soll, wann es kritisch wird, wer in der Gruppe arbeitet. */
export function GruppePersonalKarte({
  status,
  modell,
  kritisch,
  personen,
  belastbar,
}: {
  status: GruppeStatus;
  modell: "bayern" | "bw" | "nrw";
  kritisch: { monat: string; ampel: Ampel } | null;
  personen: GruppenPerson[];
  /** false = zu wenig Personal ist Gruppen zugeordnet, die Werte wären irreführend. */
  belastbar: boolean;
}) {
  const p = status.personal;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-primary">Personal dieser Gruppe</h2>
        {belastbar ? <AmpelBadge ampel={p.ampel} labels={AMPEL_LABELS} /> : null}
      </div>

      {belastbar ? (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            <span className="font-semibold tabular-nums">
              {std(p.istStunden)} von {std(p.sollStunden)} Wochenstunden
            </span>
            {p.fk && p.ek && p.ek.soll > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                (Fachkraft {std(p.fk.ist)}/{std(p.fk.soll)}, Ergänzungskraft {std(p.ek.ist)}/{std(p.ek.soll)})
              </span>
            ) : null}
            {p.bayern?.schluessel ? <span className="text-muted-foreground"> · Richtwert 1 : {std(p.bayern.schluessel)}</span> : null}
          </p>
          <p className={kritisch ? (kritisch.ampel === "rot" ? "font-medium text-destructive" : "font-medium text-amber-700 dark:text-amber-400") : "text-muted-foreground"}>
            {kritisch ? `Ab ${monatLang(kritisch.monat)} ${kritisch.ampel === "rot" ? "fehlt Personal" : "wird das Personal knapp"}.` : "In den nächsten 12 Monaten reicht das Personal."}
          </p>
          {modell === "bayern" ? (
            <p className="text-xs text-muted-foreground">Gesetzlich gilt der Anstellungsschlüssel der ganzen Einrichtung; der Wert je Gruppe ist ein Richtwert.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Zu wenig Personal ist Gruppen zugeordnet, daher gibt es keinen belastbaren Wert je Gruppe.{" "}
          <Link href="/team" className="text-primary underline-offset-2 hover:underline">
            Personal zuordnen
          </Link>
        </p>
      )}

      {personen.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {personen.map((m) => (
            <li key={m.id}>
              <Link href={`/team/${m.id}`} className="text-primary underline-offset-2 hover:underline">
                {m.name}
              </Link>{" "}
              <span className="text-xs text-muted-foreground">
                {std(m.wochenstunden)} Std.{m.kategorie === "ek" ? " · Ergänzungskraft" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Dieser Gruppe ist noch kein Personal zugeordnet.</p>
      )}
    </section>
  );
}
