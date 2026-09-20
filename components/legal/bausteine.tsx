import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

const RECHTSSEITEN = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/avv", label: "Auftragsverarbeitung" },
  { href: "/tom", label: "Sicherheit (TOM)" },
  { href: "/unterauftragnehmer", label: "Unterauftragnehmer" },
];

/** Kennzeichnet eine noch offene Entscheidung im Text, z. B. „[Kündigungsfrist festlegen]“. */
export function Platzhalter({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-accent/25 px-1 text-foreground" title="Noch offen — vor dem Livegang festlegen">
      [{children}]
    </mark>
  );
}

/** Zeigt eine Angabe des Betreibers oder — wenn sie fehlt — eine sichtbare Lücke. */
export function Angabe({ wert, name }: { wert: string | null | undefined; name: string }) {
  if (wert && wert.trim() !== "") return <>{wert}</>;
  return <Platzhalter>{name} fehlt</Platzhalter>;
}

export function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 text-sm leading-relaxed">
      <h2 className="font-heading text-lg text-primary">{titel}</h2>
      {children}
    </section>
  );
}

export function RechtstextSeite({
  titel,
  stand,
  entwurf,
  breit = false,
  children,
}: {
  titel: string;
  stand?: string;
  entwurf: boolean;
  breit?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto flex flex-col gap-6 px-6 py-16", breit ? "max-w-4xl" : "max-w-2xl")}>
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Zurück zur Startseite
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">{titel}</h1>
        {stand ? <p className="text-xs text-muted-foreground">Stand: {stand}</p> : null}
      </div>
      {entwurf ? (
        <p className="rounded-xl border border-dashed border-accent bg-accent/10 p-4 text-sm text-muted-foreground">
          Entwurf — dieser Text ist noch nicht juristisch geprüft. Markierte Stellen <Platzhalter>so</Platzhalter> sind noch offen und werden vor dem
          Produktivstart festgelegt.
        </p>
      ) : null}
      {children}
      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 text-sm text-muted-foreground" aria-label="Rechtliche Informationen">
        {RECHTSSEITEN.map((s) => (
          <Link key={s.href} href={s.href} className="hover:text-foreground">
            {s.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
