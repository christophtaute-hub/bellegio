import { HilfeLink } from "@/components/hilfe/hilfe-link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canViewFinanzen, canViewGehaelter, canWriteBelegung, canWritePersonal } from "@/lib/server/current-user-role";
import { computeVorname } from "@/lib/server/current-user-name";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { ladeSteuerung, VORAUSSCHAU_OPTIONEN, VORAUSSCHAU_STANDARD } from "@/lib/steuerung/lade-steuerung";
import { StichtagPicker } from "@/components/shared/stichtag-picker";
import { ErsteSchritte } from "@/components/dashboard/erste-schritte";
import { Cockpit } from "@/components/dashboard/cockpit";
import { baueCockpit } from "@/lib/steuerung/cockpit";
import { Handlungsliste } from "@/components/dashboard/handlungsliste";
import { GruppenAmpel } from "@/components/dashboard/gruppen-ampel";
import { KitaAmpelAnsicht } from "@/components/steuerung/kita-ampel-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

/** Das Dashboard beantwortet drei Fragen: Wo ist ein Problem? Warum? Was muss ich tun? Zuerst die zwei Ampeln (Belegung,
 * Personal), dann die Handlungsliste und die Gruppen. Verlauf, Diagramme und der frei wählbare Stichtag stehen erst nach
 * einem Klick auf „Detailansicht“. Alles Weitere (Zahlenreihen, Zusammensetzung, Finanzverlauf) steht im Controlling. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ stichtag?: string; monate?: string; ansicht?: string }> }) {
  const { stichtag: stichtagParam, monate: monateParam, ansicht } = await searchParams;
  const verlauf = ansicht === "verlauf";
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
  const [darfBelegung, darfPersonal, einrichtungName] = einrichtungId
    ? await Promise.all([
        canWriteBelegung(supabase, einrichtungId),
        canWritePersonal(supabase, einrichtungId),
        supabase.from("einrichtungen").select("name").eq("id", einrichtungId).single().then((r) => r.data?.name ?? "Einrichtung"),
      ])
    : [false, false, ""];
  const daten = einrichtungId ? await ladeSteuerung(supabase, einrichtungId, stichtag, { zeigeFinanzen, zeigeGehaelter, monateVoraus: gewaehlteMonate }) : null;

  const cockpit = daten ? baueCockpit(daten) : null;

  const verlaufLink = `/dashboard?${new URLSearchParams({ ansicht: "verlauf", ...(stichtag !== heute ? { stichtag } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight text-primary">{vorname ? `Aloha, ${vorname}` : "Dashboard"}</h1>
          {stichtag !== heute ? <p className="text-sm text-muted-foreground">Vorschau für den {formatDate(stichtag)}</p> : null}
          <HilfeLink kapitel="01-dashboard" text="Die Ampeln erklärt" />
        </div>
        {daten && !verlauf ? (
          <Button nativeButton={false} render={<Link href={verlaufLink} />} variant="outline">
            Detailansicht
          </Button>
        ) : null}
      </div>

      {einrichtungId ? (
        <Suspense fallback={null}>
          <ErsteSchritte einrichtungId={einrichtungId} />
        </Suspense>
      ) : null}

      {daten && cockpit && einrichtungId ? (
        verlauf ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline" size="sm">
                ← Zurück zur Übersicht
              </Button>
              <StichtagPicker basePath="/dashboard" stichtag={stichtag} kompakt behalte={{ monate: String(gewaehlteMonate), ansicht: "verlauf" }} />
            </div>
            <Cockpit
              cockpit={{ ...cockpit, monate: cockpit.monate.slice(0, gewaehlteMonate) }}
              monate={gewaehlteMonate}
              jetztLabel={stichtag === heute ? "Jetzt" : formatDate(stichtag)}
              stichtagParam={stichtag !== heute ? stichtag : null}
            />
          </>
        ) : (
          <>
            <Card className="gap-0 py-3">
              <CardContent className="px-3">
                <KitaAmpelAnsicht
                  einrichtungId={einrichtungId}
                  einrichtungName={einrichtungName}
                  ampel={daten.kitaAmpel}
                  darfBelegung={darfBelegung}
                  darfPersonal={darfPersonal}
                />
              </CardContent>
            </Card>
            {/* Der Personal-Engpass der Einrichtung steht schon oben in der Ampel — hier nicht doppelt. */}
            <Handlungsliste handlungen={daten.handlungen.filter((h) => h.id !== "personal-einrichtung")} />
            <GruppenAmpel
              gruppen={daten.gruppen}
              modell={daten.modell}
              zuordnung={daten.zuordnung}
              stichtagMonat={`${stichtag.slice(0, 7)}-01`}
            />
          </>
        )
      ) : null}
    </div>
  );
}
