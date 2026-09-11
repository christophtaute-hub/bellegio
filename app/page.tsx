import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const cookieStore = await cookies();
    const hasActiveEinrichtung = Boolean(
      cookieStore.get(ACTIVE_EINRICHTUNG_COOKIE)?.value
    );
    redirect(hasActiveEinrichtung ? "/dashboard" : "/einrichtung-auswahl");
  }

  return <LandingPage />;
}
