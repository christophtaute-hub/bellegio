"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [{ href: "/marketing", label: "Dashboard", exakt: true }] as { href: string; label: string; exakt?: boolean }[];

/** Navigation der Marketing-Ampel; Einträge kommen mit den jeweiligen Seiten dazu. */
export function MarketingNav({ zusaetzlich = [] }: { zusaetzlich?: { href: string; label: string; exakt?: boolean }[] }) {
  const pathname = usePathname();
  const items: { href: string; label: string; exakt?: boolean }[] = [...ITEMS, ...zusaetzlich];
  return (
    <nav aria-label="Marketing" className="flex items-center gap-1">
      {items.map((i) => {
        const aktiv = i.exakt ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={aktiv ? "page" : undefined}
            className={cn("rounded-full px-3 py-1 text-sm transition-colors", aktiv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
