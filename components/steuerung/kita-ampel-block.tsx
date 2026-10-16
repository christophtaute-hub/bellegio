import { createClient } from "@/lib/supabase/server";
import { canViewFinanzen, canWriteBelegung, canWritePersonal } from "@/lib/server/current-user-role";
import { ladeKitaAmpel } from "@/lib/steuerung/kita-ampel";
import { plusMinusStatus } from "@/lib/ui/status";
import { AmpelZeile } from "@/components/steuerung/ampel-zeile";

/** Die zwei Ampeln einer Einrichtung (Belegung, Personal) plus — mit Finanz-Recht — das Ergebnis des Monats als farbige Zahl.
 * Wird von der Einrichtungs-Übersicht („Meine Einrichtungen“) und vom Dashboard benutzt. */
export async function KitaAmpelBlock({ einrichtungId, einrichtungName, stichtag }: { einrichtungId: string; einrichtungName: string; stichtag: string }) {
  const supabase = await createClient();
  const [zeigeFinanzen, darfBelegung, darfPersonal] = await Promise.all([
    canViewFinanzen(supabase, einrichtungId),
    canWriteBelegung(supabase, einrichtungId),
    canWritePersonal(supabase, einrichtungId),
  ]);
  const a = await ladeKitaAmpel(supabase, einrichtungId, stichtag, { zeigeFinanzen });
  const geld = a.ergebnisMonat !== null ? { ...plusMinusStatus(a.ergebnisMonat), betrag: a.ergebnisMonat } : null;

  if (a.belegung.sollplaetze === 0) {
    return <p className="px-2 text-sm text-muted-foreground">Noch keine Gruppen angelegt — öffnen und die ersten Schritte durchgehen.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <AmpelZeile
        einrichtungId={einrichtungId}
        einrichtungName={einrichtungName}
        bereich="belegung"
        titel="Belegung"
        ampel={a.belegung.ampel}
        satz={a.belegung.satz}
        ursache={null}
        letzteMassnahme={a.letzteMassnahme.belegung}
        kannSchreiben={darfBelegung}
        zielMonat={a.belegung.ausloeserMonat}
      />
      <AmpelZeile
        einrichtungId={einrichtungId}
        einrichtungName={einrichtungName}
        bereich="personal"
        titel="Personal"
        ampel={a.personal.ampel}
        satz={a.personal.satz}
        ursache={a.personal.ursache}
        letzteMassnahme={a.letzteMassnahme.personal}
        kannSchreiben={darfPersonal}
        zielMonat={a.personal.ausloeserMonat}
      />
      {geld ? (
        <div className="mx-2 mt-1 flex items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Ergebnis im Monat</span>
          <span className="flex items-center gap-2">
            <span className={`font-medium tabular-nums ${geld.ton === "plus" ? "text-emerald-700 dark:text-emerald-400" : geld.ton === "minus" ? "text-destructive" : ""}`}>
              {geld.betrag > 0 ? "+" : ""}
              {geld.betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </span>
            <span className={`size-3 shrink-0 rounded-full ${geld.ton === "plus" ? "bg-emerald-500" : geld.ton === "minus" ? "bg-destructive" : "bg-muted-foreground/40"}`} aria-hidden />
          </span>
        </div>
      ) : null}
    </div>
  );
}
