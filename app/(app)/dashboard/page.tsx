import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canViewFinanzen, canViewGehaelter } from "@/lib/server/current-user-role";
import { computeVorname } from "@/lib/server/current-user-name";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { ladeSteuerung, VORAUSSCHAU_OPTIONEN, VORAUSSCHAU_STANDARD } from "@/lib/steuerung/lade-steuerung";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { ErsteSchritte } from "@/components/dashboard/erste-schritte";
import { Cockpit } from "@/components/dashboard/cockpit";
import { baueCockpit } from "@/lib/steuerung/cockpit";
import { StatusChips } from "@/components/dashboard/status-chips";
import { Handlungsliste } from "@/components/dashboard/handlungsliste";
import { GruppenAmpel } from "@/components/dashboard/gruppen-ampel";

/** Das Dashboard beantwortet drei Fragen: Wo ist ein Problem? Warum? Was muss ich tun? Ein Stichtag gilt für die ganze
 * Seite — auch für künftige Zeitpunkte. Alles Weitere (Zahlenreihen, Zusammensetzung, Finanzverlauf) steht im Controlling. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ stichtag?: string; monate?: string }> }) {
  const { stichtag: stichtagParam, monate: monateParam } = await searchParams;
  const gewaehlteMonate = VORAUSSCHAU_OPTIONEN.find((n) => n === Number(monateParam)) ?? VORAUSSCHAU_STANDARD;
  const heute = toIsoDateString(new Date());
  const stichtag = stichtagParam && /^\d{4}-\d{2}-\d{2}$/.test(stichtagParam) ? stichtagParam : heute;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("user_profiles").select("full_name, email").eq("id", user.id).single()
    : { data: null };
  const vorname = computeVorname(profile?.full_name, profile?.email, user?.email);

  const zeigeFinanzen = einrichtungId ? await canViewFinanzen(supabase, einrichtungId) : false;
  const zeigeGehaelter = einrichtungId ? await canViewGehaelter(supabase, einrichtungId) : false;
  const daten = einrichtungId ? await ladeSteuerung(supabase, einrichtungId, stichtag, { zeigeFinanzen, zeigeGehaelter, monateVoraus: gewaehlteMonate }) : null;

  const cockpit = daten ? baueCockpit(daten) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">{vorname ? `Aloha, ${vorname}` : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">
          {stichtag === heute ? "Stand heute" : `Vorschau für den ${formatDate(stichtag)}`} — wo etwas nicht stimmt, warum und was zu tun ist.
        </p>
      </div>

      <StichtagPicker basePath="/dashboard" stichtag={stichtag} kompakt behalte={{ monate: String(gewaehlteMonate) }} />

      {einrichtungId ? (
        <Suspense fallback={null}>
          <ErsteSchritte einrichtungId={einrichtungId} />
        </Suspense>
      ) : null}

      {daten && cockpit ? (
        <>
          <Cockpit
            cockpit={{ ...cockpit, monate: cockpit.monate.slice(0, gewaehlteMonate) }}
            monate={gewaehlteMonate}
            jetztLabel={stichtag === heute ? "Jetzt" : formatDate(stichtag)}
            stichtagParam={stichtag !== heute ? stichtag : null}
          />
          <StatusChips daten={daten} />
          {/* Der Personal-Engpass der Einrichtung steht schon oben im Cockpit — hier nicht doppelt. */}
          <Handlungsliste handlungen={daten.handlungen.filter((h) => h.id !== "personal-einrichtung")} />
          <GruppenAmpel
            gruppen={daten.gruppen}
            modell={daten.modell}
            zuordnung={daten.zuordnung}
            stichtagMonat={`${stichtag.slice(0, 7)}-01`}
          />
        </>
      ) : null}
    </div>
  );
}
