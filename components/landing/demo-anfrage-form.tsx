"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendeDemoAnfrage } from "@/lib/actions/demo-anfrage";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 text-sm text-white [&>option]:text-black";
const FELD_CLASS = "border-white/15 bg-white/5 text-white placeholder:text-white/40";

export function DemoAnfrageForm() {
  const [status, setStatus] = useState<"offen" | "sendet" | "gesendet">("offen");
  const [fehler, setFehler] = useState<string | null>(null);

  if (status === "gesendet") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <CheckCircle2 className="size-10 text-emerald-400" />
        <p className="font-heading text-2xl font-semibold">Danke für deine Anfrage!</p>
        <p className="text-white/60">Wir melden uns bei dir und zeigen dir Bellegio an deinem Beispiel.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-left md:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setFehler(null);
        setStatus("sendet");
        const daten = new FormData(event.currentTarget);
        const ergebnis = await sendeDemoAnfrage({
          name: daten.get("name"),
          organisation: daten.get("organisation"),
          bundesland: daten.get("bundesland"),
          email: daten.get("email"),
          nachricht: daten.get("nachricht") || undefined,
          website: daten.get("website") || undefined,
        });
        if (ergebnis.ok) setStatus("gesendet");
        else {
          setFehler(ergebnis.fehler);
          setStatus("offen");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-white/80">Name</Label>
          <Input id="name" name="name" required maxLength={120} autoComplete="name" className={FELD_CLASS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organisation" className="text-white/80">Einrichtung / Träger</Label>
          <Input id="organisation" name="organisation" required maxLength={160} className={FELD_CLASS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bundesland" className="text-white/80">Bundesland</Label>
          <select id="bundesland" name="bundesland" defaultValue="by" className={SELECT_CLASS}>
            <option value="by">Bayern</option>
            <option value="bw">Baden-Württemberg</option>
            <option value="nrw">Nordrhein-Westfalen</option>
            <option value="andere">Anderes Bundesland</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-white/80">E-Mail</Label>
          <Input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={FELD_CLASS} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nachricht" className="text-white/80">Was möchtest du sehen? (optional)</Label>
        <Textarea id="nachricht" name="nachricht" rows={3} maxLength={2000} className={FELD_CLASS} />
      </div>
      {/* Honeypot: für Menschen unsichtbar. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {fehler ? <p className="text-sm text-red-300">{fehler}</p> : null}
      <Button
        type="submit"
        size="lg"
        shape="pill"
        disabled={status === "sendet"}
        className="self-start bg-white px-8 text-black hover:bg-white/90"
      >
        {status === "sendet" ? "Wird gesendet…" : "Demo anfragen"}
      </Button>
      <p className="text-xs text-white/40">
        Wir nutzen deine Angaben ausschließlich, um dich zur Demo zu kontaktieren (siehe Datenschutz).
      </p>
    </form>
  );
}
