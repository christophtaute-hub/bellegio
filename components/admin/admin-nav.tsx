"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const LINKS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/einnahmen", label: "Einnahmen" },
  { href: "/admin/rechnungen", label: "Rechnungen" },
  { href: "/admin/kunden", label: "Kunden & Preise" },
  { href: "/admin/anfragen", label: "Demo-Anfragen" },
  { href: "/admin/einstellungen", label: "Betreiberdaten" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const aktiv = LINKS.map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="flex flex-wrap gap-1 print:hidden">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            link.href === aktiv && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
