import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { berechnePersonalAusblick } from "@/lib/ausblick/personal-ausblick";
import { toIsoDateString } from "@/lib/kita-datum";
import { STANDARD_GRENZEN, stufeAusGrenzen } from "@/lib/marketing/ampel";
import { getMarketingZugriff } from "@/lib/server/marketing";

export type MarketingVorschlag = {
  freieU3: number;
  freieUe3: number;
  fehlendeStunden: number;
  stufeBelegung: number;
  stufePersonalbedarf: number;
};

/** „Bellegio schlägt vor“: freie Plätze (Krippe = U3, Kindergarten = Ü3) und fehlende Personalstunden aus den echten Daten der
 * Einrichtung. Marketing-Nutzer dürfen Kinder und Team nicht lesen — deshalb Service-Client NACH der Rechteprüfung; es verlassen
 * nur diese fünf Zahlen den Server, keine Namen und keine Einzelwerte. Bestehende Berechnungen werden nur gelesen. */
export async function ladeMarketingVorschlag(einrichtungId: string): Promise<MarketingVorschlag | null> {
  if ((await getMarketingZugriff()) === "kein_zugriff") return null;
  const supabase = await createClient();
  const { data: sichtbar } = await supabase.rpc("marketing_einrichtungen");
  if (!(sichtbar ?? []).some((e) => e.id === einrichtungId)) return null;

  let dienst;
  try {
    dienst = createServiceRoleClient();
  } catch {
    return null;
  }
  const heute = toIsoDateString(new Date());
  const [{ data: gruppen }, kinderRows, monate, { data: einrichtung }] = await Promise.all([
    dienst.from("gruppen").select("id, gruppenart, sollplatze").eq("einrichtung_id", einrichtungId).is("archived_at", null),
    getKinderPresenceAtDate(dienst, einrichtungId, heute),
    buildForecastMonths(dienst, einrichtungId, heute, 1, false, true),
    dienst.from("einrichtungen").select("vollzeit_wochenstunden").eq("id", einrichtungId).single(),
  ]);

  const kinderJeGruppe = new Map<string, number>();
  const gesehen = new Set<string>();
  for (const r of kinderRows) {
    if (gesehen.has(r.kind_id) || !r.gruppe_id) continue;
    gesehen.add(r.kind_id);
    kinderJeGruppe.set(r.gruppe_id, (kinderJeGruppe.get(r.gruppe_id) ?? 0) + 1);
  }
  let freieU3 = 0;
  let freieUe3 = 0;
  for (const g of gruppen ?? []) {
    const frei = Math.max(0, Number(g.sollplatze) - (kinderJeGruppe.get(g.id) ?? 0));
    if (g.gruppenart === "krippe") freieU3 += frei;
    else if (g.gruppenart === "kindergarten") freieUe3 += frei;
  }
  const ausblick = berechnePersonalAusblick(monate, Number(einrichtung?.vollzeit_wochenstunden ?? 39), []);
  const fehlendeStunden = Math.ceil(ausblick.monate[0]?.fehlendeStunden ?? 0);

  return {
    freieU3,
    freieUe3,
    fehlendeStunden,
    stufeBelegung: stufeAusGrenzen(freieU3 + freieUe3, STANDARD_GRENZEN.belegung),
    stufePersonalbedarf: stufeAusGrenzen(fehlendeStunden, STANDARD_GRENZEN.personalbedarf),
  };
}
