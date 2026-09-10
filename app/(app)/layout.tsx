import { cookies } from "next/headers";
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
