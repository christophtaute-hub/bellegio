"use client";

import { Sparkles } from "lucide-react";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import {
  empfehleGruppen,
  type GruppeFuerPassung,
  type PassungsEinschaetzung,
} from "@/lib/kinder/gruppen-passung";

const EINSCHAETZUNG_ZU_AMPEL: Record<PassungsEinschaetzung, Ampel> = {
  gut: "gruen",
  bedingt: "gelb",
  schlecht: "rot",
};

const EINSCHAETZUNG_LABEL: Record<PassungsEinschaetzung, string> = {
  gut: "Gut passend",
  bedingt: "Bedingt passend",
  schlecht: "Schlecht passend",
};

function passungsAmpel(einschaetzung: PassungsEinschaetzung) {
  return EINSCHAETZUNG_ZU_AMPEL[einschaetzung];
}

function passungsLabels(einschaetzung: PassungsEinschaetzung): Partial<Record<Ampel, string>> {
  return { [EINSCHAETZUNG_ZU_AMPEL[einschaetzung]]: EINSCHAETZUNG_LABEL[einschaetzung] };
}

/** Rein beratende Einschätzung für ein Nachrücker-Kind — keine Sperre.
 * Zeigt die Passung der aktuell gewählten Gruppe plus die insgesamt am
 * besten passenden Alternativen zum Anklicken. */
export function GruppenPassungHinweis({
  geburtsdatum,
  geschlecht,
  ausgewaehlteGruppeId,
  gruppen,
  onGruppeWaehlen,
}: {
  geburtsdatum: string;
  geschlecht: string;
  ausgewaehlteGruppeId: string;
  gruppen: GruppeFuerPassung[];
  onGruppeWaehlen: (gruppeId: string) => void;
}) {
  if (!geburtsdatum || gruppen.length === 0) return null;

  const empfehlungen = empfehleGruppen({ geburtsdatum, geschlecht }, gruppen);
  const aktuelle = empfehlungen.find((e) => e.gruppeId === ausgewaehlteGruppeId);
  const alternativen = empfehlungen
    .filter((e) => e.gruppeId !== ausgewaehlteGruppeId)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border bg-secondary/30 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-medium text-primary">
          Gruppen-Passung (Alter &amp; Geschlecht, nur Empfehlung)
        </h3>
      </div>

      {aktuelle ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{aktuelle.gruppeName}:</span>
            <AmpelBadge
              ampel={passungsAmpel(aktuelle.einschaetzung)}
              labels={passungsLabels(aktuelle.einschaetzung)}
            />
            {!aktuelle.hatFreienPlatz ? (
              <span className="text-xs text-muted-foreground">kein freier Platz</span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{aktuelle.altersHinweis}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Noch keine Gruppe ausgewählt.</p>
      )}

      {alternativen.length > 0 ? (
        <div className="flex flex-col gap-1 border-t pt-2.5">
          <p className="text-xs text-muted-foreground">Andere Gruppen im Vergleich:</p>
          <ul className="flex flex-col gap-1">
            {alternativen.map((e) => (
              <li key={e.gruppeId} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onGruppeWaehlen(e.gruppeId)}
                  className="text-sm underline-offset-2 hover:underline"
                >
                  {e.gruppeName}
                </button>
                <AmpelBadge
                  ampel={passungsAmpel(e.einschaetzung)}
                  labels={passungsLabels(e.einschaetzung)}
                />
                {!e.hatFreienPlatz ? (
                  <span className="text-xs text-muted-foreground">kein freier Platz</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
