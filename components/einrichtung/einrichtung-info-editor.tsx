"use client";

import { useState, useTransition } from "react";
import { updateEinrichtungInfo, type EinrichtungInfoInput } from "@/lib/actions/einrichtung";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

/** Pflege der Angaben für „Einrichtung auf einen Blick“ (Kurzansicht im Seitenkopf). */
export function EinrichtungInfoEditor({ einrichtungId, info, canEdit }: { einrichtungId: string; info: EinrichtungInfoInput; canEdit: boolean }) {
  const [werte, setWerte] = useState({
    leitung_name: info.leitung_name ?? "",
    telefon: info.telefon ?? "",
    email: info.email ?? "",
    oeffnungszeiten: info.oeffnungszeiten ?? "",
    schliesszeiten: info.schliesszeiten ?? "",
    basisinfos: info.basisinfos ?? "",
  });
  const [pending, starte] = useTransition();
  const feld = (name: keyof typeof werte) => ({
    value: werte[name],
    disabled: !canEdit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setWerte({ ...werte, [name]: e.target.value }),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        starte(async () => {
          try {
            await updateEinrichtungInfo(einrichtungId, werte);
            meldeErfolg("Angaben gespeichert.");
          } catch (fehler) {
            meldeFehler(fehler instanceof Error ? fehler.message : "Speichern fehlgeschlagen.");
          }
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="info-leitung">Kitaleitung</Label>
          <Input id="info-leitung" autoComplete="off" {...feld("leitung_name")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="info-telefon">Telefon</Label>
          <Input id="info-telefon" type="tel" autoComplete="off" {...feld("telefon")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="info-email">E-Mail</Label>
          <Input id="info-email" type="email" autoComplete="off" {...feld("email")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="info-oeffnung">Öffnungszeiten</Label>
          <Textarea id="info-oeffnung" rows={3} placeholder="z. B. Mo–Fr 7:00–17:00 Uhr" {...feld("oeffnungszeiten")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="info-schliess">Schließzeiten</Label>
          <Textarea id="info-schliess" rows={3} placeholder="z. B. 24.12.–01.01., drei Wochen im August" {...feld("schliesszeiten")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="info-basis">Weitere Informationen für Vertretungen</Label>
        <Textarea id="info-basis" rows={4} placeholder="z. B. Schlüsselbox, Notfallnummern, Abholregeln, Besonderheiten der Gruppen" {...feld("basisinfos")} />
      </div>
      {canEdit ? (
        <Button type="submit" size="sm" disabled={pending} className="self-start">
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      ) : null}
    </form>
  );
}
