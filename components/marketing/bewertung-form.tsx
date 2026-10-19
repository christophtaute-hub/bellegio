"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { speichereMarketingBewertung } from "@/lib/actions/marketing-bewertung";
import { AMPEL_TITEL, ampelStufen, STANDARD_KRITERIEN, type AmpelFarbe, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import type { MarketingVorschlag } from "@/lib/marketing/lade-vorschlag";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

export type BewertungWerte = {
  regionalleitung: string;
  personalbedarf: number | null;
  personelleQualitaet: number | null;
  paedagogischeQualitaet: number | null;
  belegung: number | null;
  fehlendeStunden: string;
  offeneStellen: string;
  freieU3: string;
  freieUe3: string;
  leitungPerformance: string;
  kommentar: string;
};

const PUNKT: Record<AmpelFarbe, string> = {
  gruen: "bg-emerald-500",
  gelb: "bg-amber-400",
  orange: "bg-orange-500",
  rot: "bg-destructive",
};

const zahl = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function StufenSchalter({ art, wert, onChange, disabled }: { art: MarketingAmpelArt; wert: number | null; onChange: (n: number | null) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={AMPEL_TITEL[art]}>
      {ampelStufen(art).map((s) => (
        <button
          key={s.stufe}
          type="button"
          role="radio"
          aria-checked={wert === s.stufe}
          disabled={disabled}
          onClick={() => onChange(wert === s.stufe ? null : s.stufe)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
            wert === s.stufe ? "border-foreground/40 bg-secondary font-medium" : "hover:bg-secondary/60",
            disabled && "cursor-default opacity-80"
          )}
        >
          <span className={cn("size-3 rounded-full", PUNKT[s.farbe])} aria-hidden />
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Vier Ampel-Karten mit Zusatzwerten, Regionalleitung und Kommentar. Bei Personalbedarf und Belegung zeigt „Bellegio schlägt vor“
 * einen Wert aus den echten Daten, den man mit einem Klick übernimmt. */
export function BewertungForm({
  einrichtungId,
  start,
  nutzer,
  vorschlag,
  darfBearbeiten,
}: {
  einrichtungId: string;
  start: BewertungWerte;
  nutzer: { id: string; full_name: string | null }[];
  vorschlag: MarketingVorschlag | null;
  darfBearbeiten: boolean;
}) {
  const [w, setW] = useState<BewertungWerte>(start);
  const [laeuft, starte] = useTransition();
  const set = <K extends keyof BewertungWerte>(k: K, v: BewertungWerte[K]) => setW((alt) => ({ ...alt, [k]: v }));
  const aus = !darfBearbeiten;

  function speichern() {
    starte(async () => {
      const r = await speichereMarketingBewertung(einrichtungId, {
        regionalleitungUserId: w.regionalleitung || null,
        ampelPersonalbedarf: w.personalbedarf,
        ampelPersonelleQualitaet: w.personelleQualitaet,
        ampelPaedagogischeQualitaet: w.paedagogischeQualitaet,
        ampelBelegung: w.belegung,
        fehlendeStundenWoche: zahl(w.fehlendeStunden),
        offeneStellen: zahl(w.offeneStellen),
        freieU3: zahl(w.freieU3),
        freieUe3: zahl(w.freieUe3),
        leitungPerformance: zahl(w.leitungPerformance),
        kommentar: w.kommentar,
      });
      if (r.ok) meldeErfolg("Bewertung gespeichert.");
      else meldeFehler(r.error);
    });
  }

  const kriterium = (art: MarketingAmpelArt, stufe: number | null) => (stufe === null ? "Noch nicht bewertet." : STANDARD_KRITERIEN[art][stufe]);
  const feld = "flex flex-col gap-1 text-xs text-muted-foreground";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h3 className="font-heading text-lg text-primary">Personalbedarf</h3>
          <StufenSchalter art="personalbedarf" wert={w.personalbedarf} onChange={(n) => set("personalbedarf", n)} disabled={aus} />
          <p className="text-xs text-muted-foreground">{kriterium("personalbedarf", w.personalbedarf)}</p>
          {vorschlag && darfBearbeiten ? (
            <button
              type="button"
              onClick={() => {
                set("personalbedarf", vorschlag.stufePersonalbedarf);
                set("fehlendeStunden", String(vorschlag.fehlendeStunden));
              }}
              className="flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Bellegio schlägt vor: {ampelStufen("personalbedarf")[vorschlag.stufePersonalbedarf].label} ({vorschlag.fehlendeStunden} Std./Woche fehlen) — übernehmen
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className={feld}>
              Fehlende Stunden pro Woche
              <Input type="number" min={0} step="0.5" value={w.fehlendeStunden} disabled={aus} onChange={(e) => set("fehlendeStunden", e.target.value)} className="h-9" />
            </label>
            <label className={feld}>
              Offene Stellen
              <Input type="number" min={0} value={w.offeneStellen} disabled={aus} onChange={(e) => set("offeneStellen", e.target.value)} className="h-9" />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h3 className="font-heading text-lg text-primary">Belegung</h3>
          <StufenSchalter art="belegung" wert={w.belegung} onChange={(n) => set("belegung", n)} disabled={aus} />
          <p className="text-xs text-muted-foreground">{kriterium("belegung", w.belegung)}</p>
          {vorschlag && darfBearbeiten ? (
            <button
              type="button"
              onClick={() => {
                set("belegung", vorschlag.stufeBelegung);
                set("freieU3", String(vorschlag.freieU3));
                set("freieUe3", String(vorschlag.freieUe3));
              }}
              className="flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Bellegio schlägt vor: {ampelStufen("belegung")[vorschlag.stufeBelegung].label} ({vorschlag.freieU3} U3 · {vorschlag.freieUe3} Ü3 frei) — übernehmen
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className={feld}>
              Freie U3-Plätze
              <Input type="number" min={0} value={w.freieU3} disabled={aus} onChange={(e) => set("freieU3", e.target.value)} className="h-9" />
            </label>
            <label className={feld}>
              Freie Ü3-Plätze
              <Input type="number" min={0} value={w.freieUe3} disabled={aus} onChange={(e) => set("freieUe3", e.target.value)} className="h-9" />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h3 className="font-heading text-lg text-primary">Personelle Qualität</h3>
          <StufenSchalter art="personelle_qualitaet" wert={w.personelleQualitaet} onChange={(n) => set("personelleQualitaet", n)} disabled={aus} />
          <p className="text-xs text-muted-foreground">{kriterium("personelle_qualitaet", w.personelleQualitaet)}</p>
          <label className={cn(feld, "max-w-[12rem]")}>
            Leitungsperformance (1–10)
            <Input type="number" min={1} max={10} value={w.leitungPerformance} disabled={aus} onChange={(e) => set("leitungPerformance", e.target.value)} className="h-9" />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h3 className="font-heading text-lg text-primary">Pädagogische Qualität</h3>
          <StufenSchalter art="paedagogische_qualitaet" wert={w.paedagogischeQualitaet} onChange={(n) => set("paedagogischeQualitaet", n)} disabled={aus} />
          <p className="text-xs text-muted-foreground">{kriterium("paedagogische_qualitaet", w.paedagogischeQualitaet)}</p>
        </section>
      </div>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[16rem_1fr]">
        <label className={feld}>
          Regionalleitung
          <select
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground dark:bg-input/30"
            value={w.regionalleitung}
            disabled={aus}
            onChange={(e) => set("regionalleitung", e.target.value)}
          >
            <option value="">– nicht festgelegt –</option>
            {nutzer.map((n) => (
              <option key={n.id} value={n.id}>
                {n.full_name ?? "Ohne Namen"}
              </option>
            ))}
          </select>
        </label>
        <label className={feld}>
          Kommentar / nächste Schritte
          <Textarea value={w.kommentar} disabled={aus} onChange={(e) => set("kommentar", e.target.value)} rows={3} maxLength={2000} className="text-sm text-foreground" />
        </label>
      </section>

      {darfBearbeiten ? (
        <div>
          <Button onClick={speichern} disabled={laeuft} size="lg">
            {laeuft ? "Speichern…" : "Bewertung speichern"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Du hast Leserechte — Änderungen sind nicht möglich.</p>
      )}
    </div>
  );
}
