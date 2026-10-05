"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export type EinstellungenTab = { href: string; label: string };

/** Reiter oben in den Einstellungen: Einrichtung, Nutzer & Rechte, Datenschutz, Rechtsgrundlagen, Mein Profil. */
export function EinstellungenTabs({ tabs }: { tabs: EinstellungenTab[] }) {
  const pathname = usePathname();
  const aktiv = tabs
    .map((t) => t.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Einstellungen" className="-mb-2 flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === aktiv ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
            t.href === aktiv ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
