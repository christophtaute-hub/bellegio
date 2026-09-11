import {
  Baby,
  Users,
  LayoutDashboard,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Baby,
    title: "Kinder & Gruppen",
    description:
      "Alle Kinder, Buchungszeiten und Sollplätze pro Gruppe auf einen Blick – automatisch nach BayKiBiG berechnet.",
  },
  {
    icon: Users,
    title: "Personal & Anstellungsschlüssel",
    description:
      "Personal anlegen und sofort sehen, ob der bayerische Anstellungsschlüssel und die Fachkraftquote eingehalten werden.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & Prognose",
    description:
      "Belegung und Personalbedarf für jeden Stichtag – auch Monate im Voraus, für vorausschauende Personalplanung.",
  },
  {
    icon: ShieldCheck,
    title: "Rechtssicher nach BayKiBiG",
    description:
      "Gewichtungsfaktoren, Buchungszeitfaktoren und Anstellungsschlüssel folgen den offiziellen bayerischen Vorgaben.",
  },
];

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl text-primary md:text-4xl">
          Alles, was deine Einrichtung wirklich braucht
        </h2>
        <p className="mt-4 text-muted-foreground">
          Eine Anwendung für Kinder, Personal und Controlling – statt
          verteilter Tabellen und Papierlisten.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col gap-4 rounded-2xl border bg-card p-8"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-5.5" />
            </div>
            <h3 className="font-heading text-xl text-primary">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
