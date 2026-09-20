import { createClient } from "@/lib/supabase/server";
import { MeinProfilForm } from "@/components/einstellungen/mein-profil-form";
import { MfaEinrichtung } from "@/components/einstellungen/mfa-einrichtung";

export default async function MeinProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">
        Mein Profil
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Deine eigenen Zugangsdaten — Name und Passwort. Für Einrichtungs- und
        Rechte-Einstellungen siehe{" "}
        <a href="/einstellungen" className="text-primary underline-offset-2 hover:underline">
          Einrichtungs-Einstellungen
        </a>
        .
      </p>
      <MeinProfilForm
        initialFullName={profile?.full_name ?? ""}
        email={profile?.email ?? user?.email ?? ""}
      />
      <MfaEinrichtung />
    </div>
  );
}
