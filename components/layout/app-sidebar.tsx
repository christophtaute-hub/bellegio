"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Baby,
  UserCog,
  TrendingUp,
  BarChart3,
  Settings,
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
  { href: "/prognose", label: "Prognose", icon: TrendingUp },
  { href: "/auswertungen", label: "Auswertungen", icon: BarChart3 },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

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
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
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
