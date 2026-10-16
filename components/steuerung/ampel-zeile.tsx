"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { legeMassnahmeAn, ladeMassnahmen, schliesseMassnahmeAb } from "@/lib/actions/massnahmen";
import { MASSNAHMEN_VORSCHLAEGE, type Massnahme, type MassnahmenBereich } from "@/lib/steuerung/massnahmen";
import { meldeErfolg, meldeFehler } from "@/lib/toast";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

const PUNKT: Record<Ampel, string> = {
  gruen: "bg-emerald-500 ring-emerald-500/25",
  gelb: "bg-amber-500 ring-amber-500/25",
  rot: "bg-destructive ring-destructive/25",
};

function datumZeit(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Eine Ampel-Zeile („Belegung“ / „Personal“): Punkt, ein Satz, bei Gelb/Rot der Knopf „Was tun?“. Klick öffnet den Dialog mit
 * Vorschlägen und dem Verlauf der bisherigen Maßnahmen (wer, wann, was). */
export function AmpelZeile({
  einrichtungId,
  einrichtungName,
  bereich,
  titel,
  ampel,
  satz,
  ursache,
  letzteMassnahme,
  kannSchreiben,
  zielMonat,
}: {
  einrichtungId: string;
  einrichtungName: string;
  bereich: MassnahmenBereich;
  titel: string;
  ampel: Ampel;
  satz: string;
  ursache: string | null;
  letzteMassnahme: string | null;
  kannSchreiben: boolean;
  /** Monat (YYYY-MM-01), auf den sich die Maßnahme bezieht — der Monat, in dem die Ampel auslöst. */
  zielMonat: string | null;
}) {
  const [offen, setOffen] = useState(false);
  const [eintraege, setEintraege] = useState<Massnahme[] | null>(null);
  const [auswahl, setAuswahl] = useState<{ typ: string; titel: string } | null>(null);
  const [eigener, setEigener] = useState("");
  const [notiz, setNotiz] = useState("");
  const [laeuft, starte] = useTransition();

  const lade = () => ladeMassnahmen(einrichtungId, bereich).then(setEintraege);
  useEffect(() => {
    if (offen) void lade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);

  function speichern() {
    const t = auswahl?.titel ?? eigener;
    starte(async () => {
      const r = await legeMassnahmeAn({ einrichtungId, bereich, typ: auswahl?.typ ?? "sonstige", titel: t, notiz, zielMonat });
      if (!r.ok) return meldeFehler(r.fehler);
      meldeErfolg("Maßnahme festgehalten.");
      setAuswahl(null);
      setEigener("");
      setNotiz("");
      await lade();
    });
  }

  function erledigt(id: string) {
    starte(async () => {
      const r = await schliesseMassnahmeAb(einrichtungId, bereich, id);
      if (!r.ok) return meldeFehler(r.fehler);
      meldeErfolg("Als erledigt markiert.");
      await lade();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/60"
      >
        <span className={cn("mt-1 size-3.5 shrink-0 rounded-full ring-4", PUNKT[ampel])} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titel}</span>
          <span className="text-sm font-medium">{satz}</span>
          {ursache ? <span className="text-xs text-muted-foreground">{ursache}</span> : null}
          {letzteMassnahme ? <span className="text-xs text-muted-foreground">Zuletzt: {letzteMassnahme}</span> : null}
        </span>
        <span className="mt-0.5 flex shrink-0 items-center text-xs text-primary group-hover:underline">
          {ampel === "gruen" ? "Verlauf" : "Was tun?"}
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-xl">
          <DialogTitle className="font-heading text-lg text-primary">
            {titel} — {einrichtungName}
          </DialogTitle>
          <DialogDescription>{satz}</DialogDescription>

          {kannSchreiben ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Was machst du?</p>
              <div className="flex flex-wrap gap-2">
                {MASSNAHMEN_VORSCHLAEGE[bereich].map((v) => (
                  <button
                    key={v.typ}
                    type="button"
                    onClick={() => {
                      setAuswahl(v);
                      setEigener("");
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-secondary",
                      auswahl?.typ === v.typ && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {v.titel}
                  </button>
                ))}
              </div>
              <Input
                value={eigener}
                onChange={(e) => {
                  setEigener(e.target.value);
                  setAuswahl(null);
                }}
                placeholder="… oder etwas anderes eintragen"
                maxLength={200}
              />
              <Textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Notiz (optional)" rows={2} maxLength={2000} />
              <div>
                <Button type="button" onClick={speichern} disabled={laeuft || (!auswahl && !eigener.trim())}>
                  {laeuft ? "Speichern…" : "Maßnahme festhalten"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Du kannst den Verlauf sehen, aber keine Maßnahmen eintragen.</p>
          )}

          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-sm font-medium">Verlauf</p>
            {eintraege === null ? (
              <p className="text-sm text-muted-foreground">Wird geladen…</p>
            ) : eintraege.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch nichts festgehalten.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {eintraege.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("font-medium", m.status === "erledigt" && "text-muted-foreground line-through")}>{m.titel}</span>
                      {m.notiz ? <span className="text-xs text-muted-foreground">{m.notiz}</span> : null}
                      <span className="text-xs text-muted-foreground">
                        {m.erstelltVon ?? "Unbekannt"} · {datumZeit(m.erstelltAm)}
                        {m.status === "erledigt" ? ` · erledigt von ${m.erledigtVon ?? "Unbekannt"} am ${m.erledigtAm ? datumZeit(m.erledigtAm) : ""}` : ""}
                      </span>
                    </div>
                    {m.status === "offen" && kannSchreiben ? (
                      <Button type="button" variant="outline" size="sm" disabled={laeuft} onClick={() => erledigt(m.id)}>
                        Erledigt
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
