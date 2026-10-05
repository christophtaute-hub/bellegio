import Link from "next/link";
import type { ReactNode } from "react";
import type { SteuerungsDaten } from "@/lib/steuerung/lade-steuerung";
import { cn } from "cn";

const TON = {
  gruen: "border-emerald-500/30 bg-emerald-500/5",
  gelb: "border-amber-400/50 bg-amber-50 dark:bg-amber-500/10",
  rot: "border-destructive/30 bg-destructive/5",
  neutral: "bg-card",
} as const;

function Chip({ href, label, children, ton }: { href: string; label: string; children: ReactNode; ton: keyof typeof TON }) {
  return (
    <Link href={href} className={cn("flex flex-col gap-0.5 rounded-2xl border px-4 py-3 transition-colors hover:border-primary/40", TON[ton])}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{children}</span>
    </Link>
  );
}

const euro = (wert: number) => wert.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const AMPEL_TEXT = { gruen: "In Ordnung", gelb: "Knapp", rot: "Handlungsbedarf" } as const;

/** Drei Zahlen, jede mit Ampel und Link: Belegung, Personal, Ergebnis. Mehr braucht der Kopf der Seite nicht. */
export function StatusChips({ daten }: { daten: SteuerungsDaten }) {
  const { belegung, personal, finanzen } = daten;
  const belegungTon = belegung.belegt > belegung.sollplaetze ? "rot" : "neutral";
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Chip href="/gruppen" label="Belegung" ton={belegungTon}>
        {belegung.belegt} / {belegung.sollplaetze} Plätze
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {belegung.belegt > belegung.sollplaetze ? `${belegung.belegt - belegung.sollplaetze} zu viel` : belegung.frei > 0 ? `${belegung.frei} frei` : "voll"}
        </span>
      </Chip>
      <Chip href="/team" label={personal.kennzahl.label} ton={personal.ampel}>
        {personal.kennzahl.value}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{AMPEL_TEXT[personal.ampel]}</span>
      </Chip>
      {finanzen ? (
        <Chip href="/controlling" label="Ergebnis im Monat" ton={finanzen.ergebnisMonat < 0 ? "gelb" : "neutral"}>
          {euro(finanzen.ergebnisMonat)}
          <span className="ml-2 text-xs font-normal text-muted-foreground">Förderung − Personal</span>
        </Chip>
      ) : null}
    </div>
  );
}
