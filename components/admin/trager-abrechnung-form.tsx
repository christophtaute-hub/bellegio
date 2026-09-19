"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { speichereTragerAbrechnung, type TragerAbrechnungInput } from "@/lib/actions/admin";

export function TragerAbrechnungForm({ tragerId, initial }: { tragerId: string; initial: TragerAbrechnungInput }) {
  const [werte, setWerte] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  function feld<K extends keyof TragerAbrechnungInput>(key: K, wert: TragerAbrechnungInput[K]) {
    setGespeichert(false);
    setWerte((alt) => ({ ...alt, [key]: wert }));
  }
  const leerAlsNull = (v: string) => v.trim() || null;
  const zahlOderNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          await speichereTragerAbrechnung(tragerId, werte);
          setGespeichert(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${tragerId}`}>Rechnungsname (leer = Trägername)</Label>
          <Input id={`name-${tragerId}`} value={werte.rechnungsname ?? ""} onChange={(e) => feld("rechnungsname", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`mail-${tragerId}`}>Rechnungs-E-Mail</Label>
          <Input id={`mail-${tragerId}`} type="email" value={werte.rechnungs_email ?? ""} onChange={(e) => feld("rechnungs_email", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`anschrift-${tragerId}`}>Rechnungsanschrift (mehrzeilig)</Label>
          <Textarea id={`anschrift-${tragerId}`} rows={2} value={werte.rechnungsanschrift ?? ""} onChange={(e) => feld("rechnungsanschrift", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ust-${tragerId}`}>USt-IdNr. des Kunden</Label>
          <Input id={`ust-${tragerId}`} value={werte.ust_id ?? ""} onChange={(e) => feld("ust_id", leerAlsNull(e.target.value))} />
        </div>
        <div className="hidden sm:block" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`grund-${tragerId}`}>Grundgebühr je Einrichtung/Monat (netto, €)</Label>
          <Input id={`grund-${tragerId}`} inputMode="decimal" value={werte.preis_grundgebuehr_pro_einrichtung ?? ""} onChange={(e) => feld("preis_grundgebuehr_pro_einrichtung", zahlOderNull(e.target.value))} placeholder="noch offen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`kind-${tragerId}`}>Preis je aktivem Kind/Monat (netto, €)</Label>
          <Input id={`kind-${tragerId}`} inputMode="decimal" value={werte.preis_pro_kind ?? ""} onChange={(e) => feld("preis_pro_kind", zahlOderNull(e.target.value))} placeholder="noch offen" />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Speichern…" : "Speichern"}</Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
      </div>
    </form>
  );
}
