import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";

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
          .select("full_name")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    activeEinrichtungId
      ? supabase
          .from("einrichtungen")
          .select("name")
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <UserMenu
            fullName={profile?.full_name ?? user?.email ?? null}
            einrichtungName={einrichtung?.name ?? null}
          />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
