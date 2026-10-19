"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { speichereMarketingEinstellungen } from "@/lib/actions/marketing-einstellungen";
import { AMPEL_ARTEN, AMPEL_TITEL, ampelStufen, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import type { MarketingEinstellungen } from "@/lib/marketing/einstellungen";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

/** Kriterien, Grenzwerte und Fristen der Marketing-Ampel. Die Grenzwerte steuern nur den „Bellegio schlägt vor“-Wert. */
export function EinstellungenForm({ start }: { start: MarketingEinstellungen }) {
  const [endet, setEndet] = useState(String(start.fristen.kampagneEndetInTagen));
  const [veraltet, setVeraltet] = useState(String(start.fristen.bewertungVeraltetNachTagen));
  const [pb, setPb] = useState(start.grenzen.personalbedarf.map(String));
  const [bel, setBel] = useState(start.grenzen.belegung.map(String));
  const [kriterien, setKriterien] = useState(start.kriterien);
  const [laeuft, starte] = useTransition();

  const setzeKriterium = (art: MarketingAmpelArt, i: number, text: string) => setKriterien((alt) => ({ ...alt, [art]: alt[art].map((t, j) => (j === i ? text : t)) }));
  const num = (s: string) => Number(s.replace(",", "."));

  function speichern() {
    starte(async () => {
      const r = await speichereMarketingEinstellungen({
        kampagneEndetInTagen: num(endet),
        bewertungVeraltetNachTagen: num(veraltet),
        grenzen: { personalbedarf: pb.map(num) as [number, number, number], belegung: bel.map(num) as [number, number, number] },
        kriterien,
      });
      if (r.ok) meldeErfolg("Einstellungen gespeichert.");
      else meldeFehler(r.error);
    });
  }

  const feld = "flex flex-col gap-1 text-xs text-muted-foreground";
  const tripel = (werte: string[], set: (v: string[]) => void, einheit: string) => (
    <div className="grid grid-cols-3 gap-3">
      {["Gelb ab", "Orange ab", "Rot ab"].map((l, i) => (
        <label key={l} className={feld}>
          {l} ({einheit})
          <Input type="number" min={0} value={werte[i]} onChange={(e) => set(werte.map((w, j) => (j === i ? e.target.value : w)))} className="h-9 text-foreground" />
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-heading text-lg text-primary sm:col-span-2">Fristen für Hinweise</h2>
        <label className={feld}>
          Kampagne endet bald: Hinweis ab … Tagen vor dem Ende
          <Input type="number" min={1} max={90} value={endet} onChange={(e) => setEndet(e.target.value)} className="h-9 text-foreground" />
        </label>
        <label className={feld}>
          Bewertung veraltet nach … Tagen ohne Aktualisierung
          <Input type="number" min={1} max={365} value={veraltet} onChange={(e) => setVeraltet(e.target.value)} className="h-9 text-foreground" />
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg text-primary">Grenzwerte für den Vorschlag aus Bellegio-Daten</h2>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Personalbedarf — fehlende Wochenstunden</p>
          {tripel(pb, setPb, "Std./Woche")}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Belegung — freie Plätze (U3 + Ü3)</p>
          {tripel(bel, setBel, "Plätze")}
        </div>
        <p className="text-xs text-muted-foreground">Unter der ersten Grenze ist der Vorschlag Grün. Die Ampel selbst wird weiterhin von Hand bewertet.</p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg text-primary">Bewertungskriterien (erscheinen unter jeder Ampel)</h2>
        {AMPEL_ARTEN.map((art) => (
          <div key={art} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{AMPEL_TITEL[art]}</p>
            {ampelStufen(art).map((s) => (
              <label key={s.stufe} className="grid grid-cols-[5rem_1fr] items-center gap-3 text-xs text-muted-foreground">
                {s.label}
                <Input value={kriterien[art][s.stufe]} maxLength={200} onChange={(e) => setzeKriterium(art, s.stufe, e.target.value)} className="h-9 text-foreground" />
              </label>
            ))}
          </div>
        ))}
      </section>

      <div>
        <Button onClick={speichern} disabled={laeuft} size="lg">
          {laeuft ? "Speichern…" : "Einstellungen speichern"}
        </Button>
      </div>
    </div>
  );
}
