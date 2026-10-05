import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { EinrichtungSwitcher } from "@/components/layout/einrichtung-switcher";
import { BundeslandBadge } from "@/components/layout/bundesland-badge";
import { GlobalSearch } from "@/components/layout/global-search";
import { zustimmungOffen } from "@/lib/server/zustimmung";
import { isPlatformOperator, istDemoNutzer } from "@/lib/server/current-user-role";

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
          .select("full_name, email, trager_id")
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

  // Alle für diesen Nutzer sichtbaren Einrichtungen seines Trägers (RLS filtert) für den Schnellwechsler.
  const { data: wechselListe } = profile?.trager_id
    ? await supabase
        .from("einrichtungen")
        .select("id, name, address_city, bundesland_code")
        .eq("trager_id", profile.trager_id)
        .is("archived_at", null)
        .order("name")
    : { data: null };

  // Defense in depth: a cookie can point at a facility this user no
  // longer has access to (revoked access, or a stale cookie proxy.ts's
  // cheaper presence-only check let through) — RLS already blocks the
  // data, but the user should be sent to pick a valid facility instead
  // of staring at an empty shell.
  if (activeEinrichtungId && !einrichtung) {
    redirect("/einrichtung-auswahl");
  }

  if (await zustimmungOffen()) redirect("/zustimmung");

  const [istBetreiber, istDemo] = await Promise.all([isPlatformOperator(), istDemoNutzer()]);

  return (
    <SidebarProvider>
      <AppSidebar abrechnung={istBetreiber ? "/admin" : null} />
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
          {(wechselListe?.length ?? 0) > 1 ? (
            <EinrichtungSwitcher
              einrichtungen={(wechselListe ?? []).map((e) => ({
                id: e.id,
                name: e.name,
                ort: e.address_city,
                bundesland_code: e.bundesland_code,
              }))}
              aktiveId={activeEinrichtungId ?? null}
            />
          ) : null}
          <div className="flex-1" />
          <GlobalSearch />
          <UserMenu
            fullName={profile?.full_name ?? user?.email ?? null}
            einrichtungName={einrichtung?.name ?? null}
            istBetreiber={istBetreiber}
          />
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
          {istDemo ? (
            <p className="rounded-xl border border-accent bg-accent/10 p-3 text-sm print:hidden">
              <span className="font-medium">Demo-Zugang.</span> Du kannst alles ausprobieren. Alle Daten sind Beispieldaten und für alle Demo-Nutzer sichtbar —
              bitte keine echten Namen eintragen.
            </p>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
