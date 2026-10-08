"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Mail, Phone, UserRound, CalendarOff, Info, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type EinrichtungInfo = {
  name: string;
  adresse: string | null;
  leitung_name: string | null;
  telefon: string | null;
  email: string | null;
  oeffnungszeiten: string | null;
  schliesszeiten: string | null;
  basisinfos: string | null;
};

function Zeile({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-sm whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}

/** Der Einrichtungsname im Seitenkopf ist ein Knopf: ein Klick öffnet „Einrichtung auf einen Blick“ — Kontakt, Öffnungs- und
 * Schließzeiten und organisatorische Basisinfos, von jeder Seite aus erreichbar (vor allem für Vertretungskräfte). */
export function EinrichtungAufEinenBlick({ info, darfPflegen }: { info: EinrichtungInfo; darfPflegen: boolean }) {
  const [offen, setOffen] = useState(false);
  const leer = !info.leitung_name && !info.telefon && !info.email && !info.oeffnungszeiten && !info.schliesszeiten && !info.basisinfos;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="truncate rounded-md px-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        title="Einrichtung auf einen Blick"
      >
        {info.name}
      </button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-lg">
          <DialogTitle className="font-heading text-lg text-primary">{info.name}</DialogTitle>
          <DialogDescription>Einrichtung auf einen Blick</DialogDescription>
          {leer ? (
            <p className="text-sm text-muted-foreground">
              Hier ist noch nichts hinterlegt.{" "}
              {darfPflegen ? (
                <Link href="/einstellungen" className="text-primary underline-offset-2 hover:underline" onClick={() => setOffen(false)}>
                  Angaben unter Einstellungen ergänzen
                </Link>
              ) : (
                "Die Träger-Administration kann die Angaben unter Einstellungen ergänzen."
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {info.adresse ? <Zeile icon={MapPin} label="Adresse">{info.adresse}</Zeile> : null}
              {info.leitung_name ? <Zeile icon={UserRound} label="Kitaleitung">{info.leitung_name}</Zeile> : null}
              {info.telefon ? (
                <Zeile icon={Phone} label="Telefon">
                  <a href={`tel:${info.telefon.replace(/[^+\d]/g, "")}`} className="text-primary underline-offset-2 hover:underline">
                    {info.telefon}
                  </a>
                </Zeile>
              ) : null}
              {info.email ? (
                <Zeile icon={Mail} label="E-Mail">
                  <a href={`mailto:${info.email}`} className="text-primary underline-offset-2 hover:underline">
                    {info.email}
                  </a>
                </Zeile>
              ) : null}
              {info.oeffnungszeiten ? <Zeile icon={Clock} label="Öffnungszeiten">{info.oeffnungszeiten}</Zeile> : null}
              {info.schliesszeiten ? <Zeile icon={CalendarOff} label="Schließzeiten">{info.schliesszeiten}</Zeile> : null}
              {info.basisinfos ? <Zeile icon={Info} label="Weitere Informationen">{info.basisinfos}</Zeile> : null}
              {darfPflegen ? (
                <Link href="/einstellungen" className="self-start text-xs text-primary underline-offset-2 hover:underline" onClick={() => setOffen(false)}>
                  Angaben bearbeiten
                </Link>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
