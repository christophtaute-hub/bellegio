"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import type { Zugriff } from "@/lib/nutzer/bereiche";

const RANG: Record<Zugriff, number> = { kein_zugriff: 0, ansehen: 1, bearbeiten: 2 };

/** Wert aus den zwei Schaltern: „Ändern“ setzt „Ansehen“ voraus, „Ansehen“ aus bedeutet kein Zugriff. */
export function zugriffAusSchaltern(ansehen: boolean, aendern: boolean): Zugriff {
  if (aendern) return "bearbeiten";
  return ansehen ? "ansehen" : "kein_zugriff";
}

/** Zwei Ein/Aus-Schalter statt eines Dropdowns: „Sehen“ und „Ändern“. `maxRang` kappt, was der Vergebende selbst nicht hat. */
export function ZugriffSchalter({
  wert,
  onChange,
  maxRang = 2,
  disabled = false,
  label,
}: {
  wert: Zugriff;
  onChange: (neu: Zugriff) => void;
  maxRang?: number;
  disabled?: boolean;
  /** Für Screenreader: wofür die Schalter gelten (z. B. „Personal bei Kita Sonnenschein“). */
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          checked={RANG[wert] >= 1}
          disabled={disabled || maxRang < 1}
          aria-label={`${label}: ansehen`}
          onCheckedChange={(an) => onChange(zugriffAusSchaltern(an, an ? RANG[wert] >= 2 : false))}
        />
        Sehen
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          checked={RANG[wert] >= 2}
          disabled={disabled || maxRang < 2}
          aria-label={`${label}: ändern`}
          onCheckedChange={(an) => onChange(zugriffAusSchaltern(an ? true : RANG[wert] >= 1, an))}
        />
        Ändern
      </label>
    </div>
  );
}

/** Schalter, der den Wert direkt über `speichern` ablegt (z. B. Server Action) und bei Fehlern zurückspringt. */
export function ZugriffSchalterGespeichert({
  start,
  speichern,
  maxRang,
  label,
}: {
  start: Zugriff;
  speichern: (neu: Zugriff) => Promise<{ ok: true } | { ok: false; error: string }>;
  maxRang: number;
  label: string;
}) {
  const [wert, setWert] = useState<Zugriff>(start);
  const [fehler, setFehler] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <ZugriffSchalter
        wert={wert}
        maxRang={maxRang}
        disabled={pending}
        label={label}
        onChange={(neu) => {
          const vorher = wert;
          setWert(neu);
          setFehler(null);
          startTransition(async () => {
            try {
              const ergebnis = await speichern(neu);
              if (!ergebnis.ok) {
                setWert(vorher);
                setFehler(ergebnis.error);
              }
            } catch {
              setWert(vorher);
              setFehler("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
            }
          });
        }}
      />
      {fehler ? <span className="text-xs text-destructive">{fehler}</span> : null}
    </div>
  );
}
