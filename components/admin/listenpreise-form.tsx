"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { speichereListenpreise } from "@/lib/actions/admin";
import { STAFFEL_GRENZE_1, STAFFEL_GRENZE_2, type Listenpreise } from "@/lib/preise";

const zahlOderNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const alsText = (v: number | null) => v?.toString().replace(".", ",") ?? "";

export function ListenpreiseForm({ initial }: { initial: Listenpreise }) {
  const [grund, setGrund] = useState(alsText(initial.grundgebuehr));
  const [proKind1, setProKind1] = useState(alsText(initial.proKind1Bis30));
  const [proKind2, setProKind2] = useState(alsText(initial.proKind31Bis60));
  const [proKind3, setProKind3] = useState(alsText(initial.proKindAb61));
  const [hinweis, setHinweis] = useState(initial.hinweis ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setGespeichert(false);
        const ergebnis = await speichereListenpreise({
          grundgebuehr: zahlOderNull(grund),
          proKind1Bis30: zahlOderNull(proKind1),
          proKind31Bis60: zahlOderNull(proKind2),
          proKindAb61: zahlOderNull(proKind3),
          hinweis: hinweis.trim() || null,
        });
        setPending(false);
        if (!ergebnis.ok) setError(ergebnis.error);
        else setGespeichert(true);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-grund">Grundgebühr je Einrichtung und Monat (netto, €)</Label>
          <Input id="liste-grund" inputMode="decimal" value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="hidden sm:block" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-kind1">Preis je Kind, 1.–{STAFFEL_GRENZE_1}. (netto, €)</Label>
          <Input id="liste-kind1" inputMode="decimal" value={proKind1} onChange={(e) => setProKind1(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-kind2">Preis je Kind, {STAFFEL_GRENZE_1 + 1}.–{STAFFEL_GRENZE_2}. (netto, €)</Label>
          <Input id="liste-kind2" inputMode="decimal" value={proKind2} onChange={(e) => setProKind2(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="liste-kind3">Preis je Kind, ab {STAFFEL_GRENZE_2 + 1}. (netto, €)</Label>
          <Input id="liste-kind3" inputMode="decimal" value={proKind3} onChange={(e) => setProKind3(e.target.value)} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="liste-hinweis">Zusatzhinweis unter den Preisen (optional, z. B. Vertragslaufzeit)</Label>
          <Input id="liste-hinweis" value={hinweis} maxLength={500} onChange={(e) => setHinweis(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Preise speichern"}
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert — die Landingpage zeigt die neuen Preise.</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
