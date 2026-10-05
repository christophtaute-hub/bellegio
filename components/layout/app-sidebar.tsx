"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Baby,
  UserCog,
  TrendingUp,
  Calculator,
  Settings,
  Receipt,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gruppen", label: "Gruppen", icon: Users },
  { href: "/kinder", label: "Kinder", icon: Baby },
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/controlling", label: "Controlling", icon: TrendingUp },
  { href: "/szenario", label: "Planung", icon: Calculator },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

/** Nur der Betreiber (Admin) bekommt den Menüpunkt „Abrechnung“ — seine Einnahmen-Übersicht und die Rechnungen, die er
 * an Kunden versendet. Träger-Administratoren und alle anderen sehen ihn nicht (und die Daten auch nicht, siehe RLS). */
export type AbrechnungZiel = "/admin" | null;

export function AppSidebar({ abrechnung = null }: { abrechnung?: AbrechnungZiel }) {
  const pathname = usePathname();
  // Ganz unten, nicht zwischen den fachlichen Menüpunkten — Abrechnung ist nur für den Betreiber sichtbar.
  const navItems = abrechnung
    ? [...NAV_ITEMS, { href: abrechnung, label: "Abrechnung", icon: Receipt }]
    : NAV_ITEMS;
  const activeHref = navItems.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-3">
            <Link href="/dashboard" className="font-heading text-lg text-primary">
              Bellegio
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.href === activeHref;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={cn(
                        isActive &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground [&_svg]:text-primary-foreground"
                      )}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
