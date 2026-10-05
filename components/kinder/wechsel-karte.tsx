"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { nimmGruppenwechselZurueck, planeGruppenwechsel } from "@/lib/actions/kinder";
import { meldeErfolg, meldeFehler } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import type { WechselVorschlag } from "@/lib/belegung/wechsel-vorschlaege";

function datum(iso: string): string {
  return iso.split("-").reverse().join(".");
}

function monatLang(iso: string): string {
  const [jahr, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Interner Wechsel am Kind (Krippe → Kindergarten): bereits geplant (mit Rücknahme), vorgeschlagen (mit „Wechsel planen“) oder
 * „kein Platz absehbar“. Der Vorschlag kommt aus berechneWechselVorschlaege (Alter, freie Plätze, Austritte). */
export function WechselKarte({
  kindId,
  kindName,
  geplant,
  vorschlag,
  ohnePlatz,
  aktuellerAustritt,
  darfBearbeiten,
}: {
  kindId: string;
  kindName: string;
  geplant: { nachGruppeName: string; abDatum: string } | null;
  vorschlag: WechselVorschlag | null;
  ohnePlatz: { fruehesterTermin: string; austritt: string } | null;
  aktuellerAustritt: string | null;
  darfBearbeiten: boolean;
}) {
  const [pending, start] = useTransition();
  if (!geplant && !vorschlag && !ohnePlatz) return null;

  function planen(v: WechselVorschlag) {
    start(async () => {
      const res = await planeGruppenwechsel(kindId, v.nachGruppeId, v.abDatum, v.neuerAustritt);
      if (res.ok) meldeErfolg(`Wechsel in ${v.nachGruppeName} ab ${datum(v.abDatum)} geplant.`);
      else meldeFehler(res.error);
    });
  }
  function zuruecknehmen() {
    start(async () => {
      const res = await nimmGruppenwechselZurueck(kindId);
      if (res.ok) meldeErfolg("Wechsel zurückgenommen — bitte das Austrittsdatum prüfen.");
      else meldeFehler(res.error);
    });
  }

  return (
    <section id="wechsel" className="flex flex-col gap-2 rounded-2xl border bg-card p-4 print:hidden">
      <h2 className="font-heading text-base text-primary">Interner Wechsel</h2>

      {geplant ? (
        <>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-emerald-700 dark:text-emerald-400">
            <span className="font-medium">{kindName}</span>
            <ArrowRight className="size-3.5" aria-hidden />
            <span className="font-medium">{geplant.nachGruppeName}</span>
            <span className="text-xs text-muted-foreground">ab {datum(geplant.abDatum)} geplant</span>
          </p>
          {darfBearbeiten ? (
            <div>
              <Button size="sm" variant="ghost" disabled={pending} onClick={zuruecknehmen}>
                Wechsel zurücknehmen
              </Button>
            </div>
          ) : null}
        </>
      ) : vorschlag ? (
        <>
          <p className="text-sm">
            <span className="font-medium">{kindName}</span> könnte ab <span className="font-medium">{monatLang(vorschlag.abDatum)}</span> intern
            von <span className="font-medium">{vorschlag.vonGruppeName}</span> in{" "}
            <span className="font-medium">{vorschlag.nachGruppeName}</span> wechseln.
          </p>
          <p className="text-xs text-muted-foreground">
            Dort ist ab dann ein Platz frei
            {vorschlag.ersetztKind ? (
              <>
                {" "}
                (
                <Link href={`/kinder/${vorschlag.ersetztKind.kindId}`} className="underline-offset-2 hover:underline">
                  {vorschlag.ersetztKind.name}
                </Link>{" "}
                geht am {datum(vorschlag.ersetztKind.austritt)})
              </>
            ) : null}
            . Der Krippenplatz wird frei
            {aktuellerAustritt ? <>; das bisherige Austrittsdatum ({datum(aktuellerAustritt)}) wird durch {datum(vorschlag.neuerAustritt)} (Einschulung) ersetzt</> : null}.
          </p>
          {darfBearbeiten ? (
            <div>
              <Button size="sm" disabled={pending} onClick={() => planen(vorschlag)}>
                Wechsel planen
              </Button>
            </div>
          ) : null}
        </>
      ) : ohnePlatz ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {kindName} kann ab {monatLang(ohnePlatz.fruehesterTermin)} in den Kindergarten, aber bis zum Austritt am {datum(ohnePlatz.austritt)} ist dort kein
          Platz absehbar. Option: Verlängerung in der Krippe bis zum Kitajahresende.
        </p>
      ) : null}
    </section>
  );
}
