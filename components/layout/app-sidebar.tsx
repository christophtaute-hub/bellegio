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
  BookOpen,
  User,
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
  { href: "/szenario", label: "Szenario-Rechner", icon: Calculator },
  { href: "/dokumentation", label: "Dokumentation", icon: BookOpen },
  { href: "/einstellungen", label: "Einrichtung", icon: Settings },
  { href: "/einstellungen/profil", label: "Mein Profil", icon: User },
] as const;

const KOSTEN_ITEM = { href: "/kosten", label: "Kosten", icon: Receipt } as const;

export function AppSidebar({ zeigeKosten = false }: { zeigeKosten?: boolean }) {
  const pathname = usePathname();
  const navItems = zeigeKosten
    ? [...NAV_ITEMS.slice(0, 7), KOSTEN_ITEM, ...NAV_ITEMS.slice(7)]
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
