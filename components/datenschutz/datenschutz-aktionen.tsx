"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kindDatenschutz, teamDatenschutz, type DatenschutzAktion } from "@/lib/actions/datenschutz";

/** Löschen und Anonymisieren für ausgetretene Kinder bzw. ausgeschiedenes Personal. Nur für die Träger-Administration
 * (die Datenbank prüft das ebenfalls). Endgültiges Löschen verlangt zusätzlich eine getippte Bestätigung. */
export function DatenschutzAktionen({
  art,
  id,
  name,
  entfernbar,
  bereitsAnonym,
  zurueckHref,
}: {
  art: "kind" | "team";
  id: string;
  name: string;
  entfernbar: boolean;
  bereitsAnonym: boolean;
  zurueckHref: string;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState<DatenschutzAktion | null>(null);
  const [eingabe, setEingabe] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fertig, setFertig] = useState<string | null>(null);

  const objekt = art === "kind" ? "Kind" : "Person";

  async function ausfuehren(aktion: DatenschutzAktion) {
    setPending(true);
    setError(null);
    const ergebnis = art === "kind" ? await kindDatenschutz(id, aktion) : await teamDatenschutz(id, aktion);
    setPending(false);
    if (!ergebnis.ok) {
      setError(ergebnis.error);
      return;
    }
    if (aktion === "loeschen") {
      router.push(zurueckHref);
      router.refresh();
      return;
    }
    setOffen(null);
    setFertig("Die Angaben wurden anonymisiert.");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-5 print:hidden">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-primary">Datenschutz</h2>
        <p className="text-sm text-muted-foreground">
          Löschen und Anonymisieren sind nur für ausgetretene Kinder bzw. ausgeschiedenes Personal möglich und lassen sich nicht
          rückgängig machen. Jeder Vorgang wird ohne personenbezogene Inhalte im Löschprotokoll festgehalten.
        </p>
      </div>

      {!entfernbar ? (
        <p className="text-sm text-muted-foreground">
          {objekt === "Kind" ? "Dieses Kind" : "Diese Person"} ist noch aktiv. Trage zuerst ein Austrittsdatum in der Vergangenheit ein.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bereitsAnonym ? <p className="text-sm text-muted-foreground">Die Angaben sind bereits anonymisiert.</p> : null}
          <div className="flex flex-wrap gap-2">
            {!bereitsAnonym ? (
              <Button variant="secondary" size="sm" onClick={() => { setOffen("anonymisieren"); setError(null); }}>
                Anonymisieren
              </Button>
            ) : null}
            <Button variant="destructive" size="sm" onClick={() => { setOffen("loeschen"); setEingabe(""); setError(null); }}>
              Endgültig löschen
            </Button>
          </div>

          {offen === "anonymisieren" ? (
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm">
              <p>
                Name{art === "kind" ? ", Notizen, Wohnort, Platznummer und Vertragsende" : ""} werden entfernt
                {art === "kind" ? ", das Geburtsdatum wird auf die Jahresmitte des Geburtsjahres gerundet" : ", Gründe für Ausfallzeiten werden entfernt"}, das Änderungsprotokoll wird gelöscht. Zeiträume, Gruppe
                {art === "kind" ? ", Buchungszeit und I-Status" : " und Wochenstunden"} bleiben für die Statistik früherer Monate erhalten.
                Ob das für den konkreten Fall ausreicht, entscheidet der Träger — im Zweifel „Endgültig löschen“.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={pending} onClick={() => ausfuehren("anonymisieren")}>
                  {pending ? "Wird ausgeführt…" : `${objekt} anonymisieren`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffen(null)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}

          {offen === "loeschen" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p>
                {name} wird mit allen Angaben{art === "kind" ? ", Gewichtungen" : ", Ausfallzeiten und Monatsstunden"} und dem Änderungsprotokoll
                endgültig gelöscht. Die Zahlen früherer Monate (Belegung, Kategorisierung, Personalschlüssel) ändern sich dadurch
                rückwirkend. Tippe zur Bestätigung <span className="font-mono font-semibold">LÖSCHEN</span>.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loeschen-bestaetigung">Bestätigung</Label>
                <Input id="loeschen-bestaetigung" value={eingabe} onChange={(e) => setEingabe(e.target.value)} className="w-48" autoComplete="off" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={pending || eingabe.trim() !== "LÖSCHEN"} onClick={() => ausfuehren("loeschen")}>
                  {pending ? "Wird gelöscht…" : "Endgültig löschen"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffen(null)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      {fertig ? <p className="text-sm text-primary">{fertig}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
