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

/** Das Monatsergebnis (nur mit Finanz-Recht). Belegung und Personal stehen in der Vorausschau darüber. */
export function StatusChips({ daten }: { daten: SteuerungsDaten }) {
  const { finanzen } = daten;
  if (!finanzen) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Chip href="/controlling" label="Ergebnis im Monat" ton={finanzen.ergebnisMonat < 0 ? "gelb" : "neutral"}>
        {euro(finanzen.ergebnisMonat)}
        <span className="ml-2 text-xs font-normal text-muted-foreground">Förderung − Personal</span>
      </Chip>
    </div>
  );
}
