"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { speichereKampagne } from "@/lib/actions/marketing-kampagne";
import { ART_LABEL, KANAL_LABEL, STATUS_LABEL, STATUS_REIHENFOLGE, type Kampagne, type KampagneArt, type KampagneKanal, type KampagneStatus } from "@/lib/marketing/kampagne";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

type Opt = { id: string; label: string };

const zahl = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const leer = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const SELECT = "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";
const FELD = "flex flex-col gap-1 text-xs text-muted-foreground";

/** Kampagne anlegen oder bearbeiten. `einrichtungId` fest (in der Einrichtungsansicht) oder per Auswahl (in der Gesamtliste). */
export function KampagneDialog({
  kampagne,
  einrichtungId,
  einrichtungen,
  nutzer,
  kind,
}: {
  kampagne?: Kampagne;
  einrichtungId?: string;
  einrichtungen: Opt[];
  nutzer: Opt[];
  kind: ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const [laeuft, starte] = useTransition();
  const [w, setW] = useState(() => ({
    einrichtungId: kampagne?.einrichtungId ?? einrichtungId ?? "",
    art: (kampagne?.art ?? "belegung") as KampagneArt,
    kanal: (kampagne?.kanal ?? "meta") as KampagneKanal,
    beworbenes: kampagne?.beworbenes ?? "",
    anzahl: leer(kampagne?.anzahl),
    beginn: kampagne?.beginn ?? "",
    ende: kampagne?.ende ?? "",
    status: (kampagne?.status ?? "geplant") as KampagneStatus,
    budget: leer(kampagne?.budget),
    kosten: leer(kampagne?.kosten),
    links: (kampagne?.links ?? []).join("\n"),
    verantwortlich: kampagne?.verantwortlichUserId ?? "",
    kommentar: kampagne?.kommentar ?? "",
    schritt: kampagne?.naechsterSchritt ?? "",
    faellig: kampagne?.schrittFaellig ?? "",
  }));
  const set = <K extends keyof typeof w>(k: K, v: (typeof w)[K]) => setW((alt) => ({ ...alt, [k]: v }));

  function speichern() {
    if (!w.einrichtungId) return meldeFehler("Bitte eine Einrichtung wählen.");
    starte(async () => {
      const r = await speichereKampagne({
        id: kampagne?.id,
        einrichtungId: w.einrichtungId,
        art: w.art,
        kanal: w.kanal,
        beworbenes: w.beworbenes,
        anzahl: zahl(w.anzahl),
        beginn: w.beginn || null,
        ende: w.ende || null,
        status: w.status,
        budget: zahl(w.budget),
        kosten: zahl(w.kosten),
        linksText: w.links,
        verantwortlichUserId: w.verantwortlich || null,
        kommentar: w.kommentar,
        naechsterSchritt: w.schritt,
        schrittFaellig: w.faellig || null,
      });
      if (!r.ok) return meldeFehler(r.error);
      meldeErfolg(kampagne ? "Kampagne gespeichert." : "Kampagne angelegt.");
      setOffen(false);
    });
  }

  return (
    <>
      <span onClick={() => setOffen(true)} className="contents">
        {kind}
      </span>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogTitle className="font-heading text-lg text-primary">{kampagne ? "Kampagne bearbeiten" : "Neue Kampagne"}</DialogTitle>
          <DialogDescription>Reine Dokumentation — Bellegio schaltet keine Anzeigen.</DialogDescription>
          <div className="grid gap-3 sm:grid-cols-2">
            {!einrichtungId && !kampagne ? (
              <label className={`${FELD} sm:col-span-2`}>
                Einrichtung
                <select className={SELECT} value={w.einrichtungId} onChange={(e) => set("einrichtungId", e.target.value)}>
                  <option value="">– wählen –</option>
                  {einrichtungen.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className={FELD}>
              Art
              <select className={SELECT} value={w.art} onChange={(e) => set("art", e.target.value as KampagneArt)}>
                {(Object.keys(ART_LABEL) as KampagneArt[]).map((a) => (
                  <option key={a} value={a}>
                    {ART_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>
            <label className={FELD}>
              Kanal
              <select className={SELECT} value={w.kanal} onChange={(e) => set("kanal", e.target.value as KampagneKanal)}>
                {(Object.keys(KANAL_LABEL) as KampagneKanal[]).map((k) => (
                  <option key={k} value={k}>
                    {KANAL_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${FELD} sm:col-span-2`}>
              Was wird beworben? (Stelle oder Betreuungsplätze)
              <Input value={w.beworbenes} onChange={(e) => set("beworbenes", e.target.value)} maxLength={200} placeholder="z. B. Erzieher/in 30 Std. oder 6 Ü3-Plätze" className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Anzahl Stellen/Plätze
              <Input type="number" min={0} value={w.anzahl} onChange={(e) => set("anzahl", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Status
              <select className={SELECT} value={w.status} onChange={(e) => set("status", e.target.value as KampagneStatus)}>
                {STATUS_REIHENFOLGE.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={FELD}>
              Kampagnenbeginn
              <Input type="date" value={w.beginn} onChange={(e) => set("beginn", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Kampagnenende
              <Input type="date" value={w.ende} onChange={(e) => set("ende", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Werbebudget (€)
              <Input type="number" min={0} step="10" value={w.budget} onChange={(e) => set("budget", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Bisherige Kosten (€)
              <Input type="number" min={0} step="10" value={w.kosten} onChange={(e) => set("kosten", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={`${FELD} sm:col-span-2`}>
              Links zu Anzeigen, Website, Funnel (ein Link pro Zeile)
              <Textarea value={w.links} onChange={(e) => set("links", e.target.value)} rows={2} className="text-sm text-foreground" placeholder="https://…" />
            </label>
            <label className={FELD}>
              Verantwortlich
              <select className={SELECT} value={w.verantwortlich} onChange={(e) => set("verantwortlich", e.target.value)}>
                <option value="">– niemand –</option>
                {nutzer.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <span />
            <label className={`${FELD} sm:col-span-2`}>
              Nächster Schritt
              <Input value={w.schritt} onChange={(e) => set("schritt", e.target.value)} maxLength={500} className="h-9 text-foreground" />
            </label>
            <label className={FELD}>
              Schritt fällig am
              <Input type="date" value={w.faellig} onChange={(e) => set("faellig", e.target.value)} className="h-9 text-foreground" />
            </label>
            <label className={`${FELD} sm:col-span-2`}>
              Kommentar
              <Textarea value={w.kommentar} onChange={(e) => set("kommentar", e.target.value)} rows={2} maxLength={2000} className="text-sm text-foreground" />
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={speichern} disabled={laeuft}>
              {laeuft ? "Speichern…" : "Speichern"}
            </Button>
            <Button variant="ghost" onClick={() => setOffen(false)} disabled={laeuft}>
              Abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
