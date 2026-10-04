import Link from "next/link";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import type { PersonalKennzahl } from "@/lib/dashboard/personal-kennzahl";
import type { Ergebnis } from "@/lib/finanzen/ergebnis";

const euro = (wert: number) => wert.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function Karte({ titel, link, children }: { titel: string; link?: { href: string; text: string }; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg text-primary">{titel}</h2>
        {link ? (
          <Link href={link.href} className="text-xs text-primary underline-offset-2 hover:underline">
            {link.text}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function BelegungKarte({ kinder, sollplaetze }: { kinder: number; sollplaetze: number }) {
  const auslastung = sollplaetze > 0 ? Math.min(100, Math.round((kinder / sollplaetze) * 100)) : 0;
  const ueberbelegt = sollplaetze > 0 && kinder > sollplaetze;
  const frei = Math.max(0, sollplaetze - kinder);
  return (
    <Karte titel="Belegung" link={{ href: "/gruppen", text: "Gruppen" }}>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-semibold tabular-nums">{kinder}</span>
        <span className="text-sm text-muted-foreground">von {sollplaetze} Plätzen</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${auslastung} % belegt`}>
        <div className={`h-full rounded-full ${ueberbelegt ? "bg-destructive" : "bg-primary"}`} style={{ width: `${auslastung}%` }} />
      </div>
      <p className={`text-sm ${ueberbelegt ? "text-destructive" : "text-muted-foreground"}`}>
        {ueberbelegt ? `${kinder - sollplaetze} über Sollplätzen` : frei === 0 ? "Voll belegt" : `${frei} ${frei === 1 ? "Platz" : "Plätze"} frei`}
      </p>
    </Karte>
  );
}

export function PersonalKarte({ personal, ampel }: { personal: PersonalKennzahl; ampel: Ampel }) {
  return (
    <Karte titel="Personal" link={{ href: "/team", text: "Team" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{personal.label}</span>
        <AmpelBadge ampel={ampel} labels={{ gruen: "In Ordnung", gelb: "Knapp", rot: "Handlungsbedarf" }} />
      </div>
      <span className="text-2xl font-semibold tabular-nums">{personal.value}</span>
    </Karte>
  );
}

export function FinanzenKarte({ finanzen }: { finanzen: Ergebnis }) {
  return (
    <Karte titel="Finanzen (laufender Monat)" link={{ href: "/controlling", text: "Controlling" }}>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Fördererlöse</dt>
          <dd className="font-medium tabular-nums">{euro(finanzen.foerdererloeseMonat)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Personalkosten</dt>
          <dd className="font-medium tabular-nums">{euro(finanzen.personalkostenMonat)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t pt-1.5">
          <dt className="font-medium">Ergebnis</dt>
          <dd className={`text-base font-semibold tabular-nums ${finanzen.ergebnisMonat < 0 ? "text-destructive" : ""}`}>
            {euro(finanzen.ergebnisMonat)}
          </dd>
        </div>
      </dl>
      {finanzen.personalkostenNichtErfasst > 0 ? (
        <p className="text-xs text-muted-foreground">
          {finanzen.personalkostenNichtErfasst} Mitarbeitende ohne Vergütung fehlen in den Personalkosten.
        </p>
      ) : null}
    </Karte>
  );
}
