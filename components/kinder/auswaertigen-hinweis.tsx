"use client";

import { AmpelBadge } from "@/components/team/ampel-badge";
import { berechneAuswaertigenQuote } from "@/lib/kinder/auswaertigen-quote";

function formatProzent(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

/** Rein beratender Hinweis zur lokalen Auswärtigen-Quote (nur Baden-
 * Württemberg, nur wenn die Einrichtung einer solchen Satzung unterliegt) —
 * keine Sperre, analog zu GruppenPassungHinweis. */
export function AuswaertigenHinweis({
  wohnort,
  standortGemeinde,
  auswaertigenQuoteProzent,
  bestehendeWohnorte,
}: {
  wohnort: string;
  standortGemeinde: string;
  auswaertigenQuoteProzent: number;
  bestehendeWohnorte: (string | null)[];
}) {
  if (!wohnort.trim()) return null;

  const ergebnis = berechneAuswaertigenQuote(
    wohnort,
    bestehendeWohnorte,
    standortGemeinde,
    auswaertigenQuoteProzent
  );

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          Auswärtigen-Anteil ({standortGemeinde}, nur Empfehlung):
        </span>
        <AmpelBadge
          ampel={ergebnis.ueberschreitetNachher ? "rot" : "gruen"}
          labels={{
            gruen: `${formatProzent(ergebnis.anteilNachher)} % — innerhalb der Quote`,
            rot: `${formatProzent(ergebnis.anteilNachher)} % — über der Quote von ${formatProzent(ergebnis.quote)} %`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Vorher {formatProzent(ergebnis.anteilVorher)} % auswärtige Kinder, mit
        diesem Kind {formatProzent(ergebnis.anteilNachher)} %. Lokale Satzung
        von {standortGemeinde} — kein gesetzliches Landesrecht, blockiert das
        Speichern nicht.
      </p>
    </div>
  );
}
