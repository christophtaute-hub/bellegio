import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { KampagneDialog } from "@/components/marketing/kampagne-dialog";
import { ART_LABEL, KANAL_LABEL, STATUS_LABEL, istUeberfaellig, tageBis, type Kampagne, type KampagneStatus } from "@/lib/marketing/kampagne";

const STATUS_KLASSE: Record<KampagneStatus, string> = {
  geplant: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  aktiv: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  pausiert: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  beendet: "bg-secondary text-muted-foreground",
};

const datum = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : null);
const euro = (n: number | null) => (n === null ? "–" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }));

/** Kampagnenkarten (Einrichtungsansicht und Gesamtübersicht). Reine Anzeige plus Bearbeiten-Dialog. */
export function KampagnenListe({
  kampagnen,
  einrichtungName,
  nutzerName,
  einrichtungen,
  nutzer,
  darfBearbeiten,
  heute,
  zeigeEinrichtung = false,
}: {
  kampagnen: Kampagne[];
  einrichtungName: Map<string, string>;
  nutzerName: Map<string, string>;
  einrichtungen: { id: string; label: string }[];
  nutzer: { id: string; label: string }[];
  darfBearbeiten: boolean;
  heute: string;
  zeigeEinrichtung?: boolean;
}) {
  if (kampagnen.length === 0) return <p className="text-sm text-muted-foreground">Keine Kampagnen.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {kampagnen.map((k) => {
        const ueberfaellig = istUeberfaellig(k, heute);
        const rest = k.status === "aktiv" && k.ende ? tageBis(k.ende, heute) : null;
        return (
          <li key={k.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                {zeigeEinrichtung ? (
                  <Link href={`/marketing/einrichtungen/${k.einrichtungId}`} className="text-xs font-medium text-primary hover:underline">
                    {einrichtungName.get(k.einrichtungId) ?? "Einrichtung"}
                  </Link>
                ) : null}
                <span className="font-medium">
                  {KANAL_LABEL[k.kanal]} · {ART_LABEL[k.art]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {k.beworbenes}
                  {k.anzahl !== null ? ` (${k.anzahl})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_KLASSE[k.status])}>{STATUS_LABEL[k.status]}</span>
                {darfBearbeiten ? (
                  <KampagneDialog kampagne={k} einrichtungen={einrichtungen} nutzer={nutzer} kind={<Button variant="outline" size="sm">Bearbeiten</Button>} />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>
                {datum(k.beginn) ?? "offen"} – {datum(k.ende) ?? "offen"}
                {rest !== null && rest >= 0 ? ` · noch ${rest} ${rest === 1 ? "Tag" : "Tage"}` : ""}
              </span>
              <span>
                Budget {euro(k.budget)} · Kosten {euro(k.kosten)}
              </span>
              {k.verantwortlichUserId ? <span>Verantwortlich: {nutzerName.get(k.verantwortlichUserId) ?? "Unbekannt"}</span> : null}
            </div>
            {k.links.length > 0 ? (
              <div className="flex flex-wrap gap-3 text-xs">
                {k.links.map((l) => (
                  <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="size-3" aria-hidden />
                    {new URL(l).hostname}
                  </a>
                ))}
              </div>
            ) : null}
            {k.naechsterSchritt ? (
              <p className={cn("text-sm", ueberfaellig && "font-medium text-destructive")}>
                Nächster Schritt: {k.naechsterSchritt}
                {k.schrittFaellig ? ` (fällig ${datum(k.schrittFaellig)})` : ""}
              </p>
            ) : ueberfaellig ? (
              <p className="text-sm font-medium text-destructive">Überfällig — Status oder Zeitraum prüfen.</p>
            ) : null}
            {k.kommentar ? <p className="text-xs text-muted-foreground">{k.kommentar}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
