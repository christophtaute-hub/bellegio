"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { berechneMonatspreis, type Listenpreise } from "@/lib/preise";
import { formatEuro } from "@/lib/admin/abrechnung";

const REGLER = "h-2 w-full cursor-pointer accent-primary";

/** Kleiner Rechner für die Preisstruktur „je Einrichtung plus je Kind, gestaffelt“ — die Staffel gilt je
 * Einrichtung, deshalb ist der zweite Regler bewusst "Kinder je Einrichtung", nicht insgesamt. Reine
 * Orientierung — verbindlich ist das Angebot bzw. die Rechnung. */
export function PreisRechner({ preise }: { preise: Listenpreise }) {
  const [einrichtungen, setEinrichtungen] = useState(1);
  const [kinderJeEinrichtung, setKinderJeEinrichtung] = useState(60);
  const preis = berechneMonatspreis(einrichtungen, kinderJeEinrichtung, preise);
  const hatKindPreis = preise.proKind1Bis30 !== null || preise.proKind31Bis60 !== null || preise.proKindAb61 !== null;

  return (
    <div className="flex flex-col gap-6 rounded-3xl border bg-secondary/40 p-8">
      <h3 className="font-heading text-xl font-semibold">Was kostet das für deine Kita?</h3>

      <div className="flex flex-col gap-2">
        <label htmlFor="rechner-einrichtungen" className="flex justify-between text-sm">
          <span>Einrichtungen</span>
          <span className="font-medium tabular-nums">{einrichtungen}</span>
        </label>
        <input id="rechner-einrichtungen" type="range" min={1} max={20} value={einrichtungen} onChange={(e) => setEinrichtungen(Number(e.target.value))} className={REGLER} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rechner-kinder" className="flex justify-between text-sm">
          <span>Kinder je Einrichtung</span>
          <span className="font-medium tabular-nums">{kinderJeEinrichtung}</span>
        </label>
        <input id="rechner-kinder" type="range" min={5} max={150} step={5} value={kinderJeEinrichtung} onChange={(e) => setKinderJeEinrichtung(Number(e.target.value))} className={REGLER} />
      </div>

      <div className="flex flex-col gap-1 border-t pt-5" aria-live="polite">
        <p className="text-sm text-muted-foreground">Im Monat, netto</p>
        <p className="font-heading text-5xl font-semibold tracking-tight tabular-nums">{formatEuro(preis.summe)}</p>
        <p className="text-xs text-muted-foreground">
          {preise.grundgebuehr !== null ? `${formatEuro(preis.grundgebuehr)} Grundgebühr` : null}
          {preise.grundgebuehr !== null && hatKindPreis ? " + " : null}
          {hatKindPreis ? `${formatEuro(preis.kinder)} für ${kinderJeEinrichtung} Kinder je Einrichtung × ${einrichtungen}` : null}
        </p>
      </div>

      <Button shape="pill" nativeButton={false} render={<Link href="/#kontakt" />} className="w-fit">
        Demo anfragen
      </Button>
    </div>
  );
}
