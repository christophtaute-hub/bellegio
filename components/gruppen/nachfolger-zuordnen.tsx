"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ordneNachfolgerZu } from "@/lib/actions/kinder";
import { meldeErfolg, meldeFehler } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export type NachrueckerOption = { id: string; name: string; eintritt: string | null };

/** Volle Monate zwischen Austritt und Eintritt des Nachfolgers (ab 2, damit ein normaler Monatswechsel nicht auffällt). */
function leerstandMonate(austritt: string | null, eintritt: string | null): number | null {
  if (!austritt || !eintritt) return null;
  const tage = (new Date(`${eintritt}T00:00:00Z`).getTime() - new Date(`${austritt}T00:00:00Z`).getTime()) / 86400000;
  const monate = Math.floor(tage / 30);
  return monate >= 2 ? monate : null;
}

/** „Kind B rückt für Kind A nach“: zeigt den festen Nachfolger eines austretenden Kindes oder bietet die Auswahl an. */
export function NachfolgerZuordnen({
  austretendId,
  austretendName,
  austritt,
  nachfolger,
  optionen,
  darfBearbeiten,
}: {
  austretendId: string;
  austretendName: string;
  /** Austrittsdatum des Kindes (YYYY-MM-DD) — für den Hinweis, wenn der Platz zwischen Austritt und Eintritt leer bleibt. */
  austritt: string | null;
  nachfolger: { kindId: string; name: string; eintritt: string | null } | null;
  /** Nachrücker, die noch niemandem fest zugeordnet sind. */
  optionen: NachrueckerOption[];
  darfBearbeiten: boolean;
}) {
  const [auswahl, setAuswahl] = useState("");
  const [aendern, setAendern] = useState(false);
  const [pending, start] = useTransition();

  function speichern(id: string | null) {
    start(async () => {
      const res = await ordneNachfolgerZu(austretendId, id);
      if (res.ok) {
        meldeErfolg(id ? "Nachfolger zugeordnet." : "Zuordnung gelöst.");
        setAendern(false);
        setAuswahl("");
      } else {
        meldeFehler(res.error);
      }
    });
  }

  if (nachfolger && !aendern) {
    const luecke = leerstandMonate(austritt, nachfolger.eintritt);
    return (
      <div className="flex flex-col gap-0.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-emerald-700 dark:text-emerald-400">
        <span className="font-medium">{austretendName}</span>
        <ArrowRight className="size-3.5" aria-hidden />
        <Link href={`/kinder/${nachfolger.kindId}`} className="font-medium underline-offset-2 hover:underline">
          {nachfolger.name}
        </Link>
        <span className="text-xs text-muted-foreground">rückt nach{nachfolger.eintritt ? ` (Eintritt ${nachfolger.eintritt.split("-").reverse().join(".")})` : ""}</span>
        {darfBearbeiten ? (
          <button type="button" className="text-xs text-primary underline-offset-2 hover:underline print:hidden" onClick={() => setAendern(true)}>
            ändern
          </button>
        ) : null}
      </p>
      {luecke ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Der Platz bleibt ca. {luecke} {luecke === 1 ? "Monat" : "Monate"} leer — Eintritt vorziehen oder weiteren Nachrücker einplanen?
        </p>
      ) : null}
      </div>
    );
  }

  if (!darfBearbeiten) return null;
  if (optionen.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Für {austretendName} ist noch kein Nachrücker vorgemerkt.{" "}
        <Link href="/kinder/neu" className="text-primary underline-offset-2 hover:underline">
          Nachrücker anlegen
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-sm">Nachfolger für {austretendName}:</span>
      <select
        value={auswahl}
        onChange={(e) => setAuswahl(e.target.value)}
        aria-label={`Nachfolger für ${austretendName} wählen`}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
      >
        <option value="">Nachrücker wählen …</option>
        {optionen.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={!auswahl || pending} onClick={() => speichern(auswahl)}>
        Zuordnen
      </Button>
      {nachfolger ? (
        <>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => speichern(null)}>
            Zuordnung lösen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAendern(false)}>
            Abbrechen
          </Button>
        </>
      ) : null}
    </div>
  );
}
