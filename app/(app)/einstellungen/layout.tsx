import { createClient } from "@/lib/supabase/server";
import { EinstellungenTabs, type EinstellungenTab } from "@/components/einstellungen/einstellungen-tabs";

/** Alles, was früher einzelne Menüpunkte waren, steht jetzt als Reiter unter „Einstellungen“ — jeder sieht nur, was er darf. */
export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("user_profiles").select("role, kann_rechte_verwalten").eq("id", user.id).single()
    : { data: null };
  const istTraegerAdmin = profil?.role === "traeger_admin";
  const { count: lokaleAdminZeilen } =
    user && !istTraegerAdmin
      ? await supabase.from("einrichtung_lokale_admins").select("einrichtung_id", { count: "exact", head: true }).eq("user_id", user.id)
      : { count: 0 };
  const darfNutzerVerwalten = istTraegerAdmin || Boolean(profil?.kann_rechte_verwalten) || (lokaleAdminZeilen ?? 0) > 0;

  const tabs: EinstellungenTab[] = [
    { href: "/einstellungen", label: "Einrichtung" },
    ...(darfNutzerVerwalten ? [{ href: "/einstellungen/nutzer", label: "Nutzer & Rechte" }] : []),
    ...(istTraegerAdmin ? [{ href: "/einstellungen/datenschutz", label: "Datenschutz" }] : []),
    { href: "/einstellungen/rechtsgrundlagen", label: "Rechtsgrundlagen" },
    { href: "/einstellungen/profil", label: "Mein Profil" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EinstellungenTabs tabs={tabs} />
      {children}
    </div>
  );
}
