import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { BundeslandBadge } from "@/components/layout/bundesland-badge";
import { Button } from "@/components/ui/button";
import { computeVorname } from "@/lib/server/current-user-name";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const activeEinrichtungId = cookieStore.get(
    ACTIVE_EINRICHTUNG_COOKIE
  )?.value;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: einrichtung }] = await Promise.all([
    user
      ? supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    activeEinrichtungId
      ? supabase
          .from("einrichtungen")
          .select("name, bundesland_code")
          .eq("id", activeEinrichtungId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Defense in depth: a cookie can point at a facility this user no
  // longer has access to (revoked access, or a stale cookie proxy.ts's
  // cheaper presence-only check let through) — RLS already blocks the
  // data, but the user should be sent to pick a valid facility instead
  // of staring at an empty shell.
  if (activeEinrichtungId && !einrichtung) {
    redirect("/einrichtung-auswahl");
  }

  const vorname = computeVorname(profile?.full_name, profile?.email, user?.email);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 min-w-0 shrink-0 items-center gap-2 border-b border-black/5 bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          {einrichtung?.name ? (
            <p className="truncate text-sm font-semibold text-primary">
              {einrichtung.name}
            </p>
          ) : null}
          {einrichtung?.bundesland_code ? (
            <BundeslandBadge code={einrichtung.bundesland_code} />
          ) : null}
          <Button
            variant="ghost"
            size="xs"
            nativeButton={false}
            render={<Link href="/einrichtung-auswahl" />}
            className="gap-1 text-muted-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            Wechseln
          </Button>
          {vorname ? (
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              Aloha, {vorname}
            </p>
          ) : null}
          <div className="flex-1" />
          <UserMenu
            fullName={profile?.full_name ?? user?.email ?? null}
            einrichtungName={einrichtung?.name ?? null}
          />
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
