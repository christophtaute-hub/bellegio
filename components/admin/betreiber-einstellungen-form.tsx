"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { speichereBetreiberEinstellungen, type BetreiberEinstellungenInput } from "@/lib/actions/admin";

export function BetreiberEinstellungenForm({ initial }: { initial: BetreiberEinstellungenInput }) {
  const [werte, setWerte] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  function feld<K extends keyof BetreiberEinstellungenInput>(key: K, wert: BetreiberEinstellungenInput[K]) {
    setGespeichert(false);
    setWerte((alt) => ({ ...alt, [key]: wert }));
  }
  const leerAlsNull = (v: string) => v.trim() || null;

  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          await speichereBetreiberEinstellungen(werte);
          setGespeichert(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firmenname">Firmenname</Label>
          <Input id="firmenname" value={werte.firmenname} onChange={(e) => feld("firmenname", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prefix">Rechnungsnummern-Präfix (optional)</Label>
          <Input id="prefix" value={werte.rechnungsnummer_praefix} onChange={(e) => feld("rechnungsnummer_praefix", e.target.value)} placeholder="z.B. RE-" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="anschrift">Anschrift (mehrzeilig)</Label>
          <Textarea id="anschrift" rows={3} value={werte.anschrift} onChange={(e) => feld("anschrift", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ust-id">USt-IdNr.</Label>
          <Input id="ust-id" value={werte.ust_id ?? ""} onChange={(e) => feld("ust_id", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="steuernr">Steuernummer</Label>
          <Input id="steuernr" value={werte.steuernummer ?? ""} onChange={(e) => feld("steuernummer", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" value={werte.iban ?? ""} onChange={(e) => feld("iban", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bic">BIC</Label>
          <Input id="bic" value={werte.bic ?? ""} onChange={(e) => feld("bic", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bank">Bank</Label>
          <Input id="bank" value={werte.bankname ?? ""} onChange={(e) => feld("bankname", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ziel">Zahlungsziel (Tage)</Label>
          <Input id="ziel" type="number" min={0} value={werte.zahlungsziel_tage} onChange={(e) => feld("zahlungsziel_tage", Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ust-satz">Standard-USt-Satz (%)</Label>
          <Input id="ust-satz" type="number" min={0} max={100} step="0.1" value={werte.ust_satz} onChange={(e) => feld("ust_satz", Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="ust-hinweis">USt-Hinweis auf der Rechnung (z.B. bei Steuerbefreiung, optional)</Label>
          <Input id="ust-hinweis" value={werte.ust_hinweis ?? ""} onChange={(e) => feld("ust_hinweis", leerAlsNull(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="fuss">Fußzeile (mehrzeilig, optional)</Label>
          <Textarea id="fuss" rows={2} value={werte.fusszeile ?? ""} onChange={(e) => feld("fusszeile", leerAlsNull(e.target.value))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Diese Angaben werden beim Freigeben einer Rechnung als Absender eingefroren. Vor dem ersten echten Versand
        die Pflichtangaben (§14 UStG) und die Steuerbehandlung mit dem Steuerberater abstimmen.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Speichern…" : "Speichern"}</Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
      </div>
    </form>
  );
}
