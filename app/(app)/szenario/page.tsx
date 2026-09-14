import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { getCurrentUserRole, canUseSzenarioRechner } from "@/lib/server/current-user-role";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth } from "@/lib/team/anstellungsschluessel";
import { SzenarioRechner } from "@/components/szenario/szenario-rechner";

export default async function SzenarioPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const role = await getCurrentUserRole();

  if (!canUseSzenarioRechner(role)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Szenario-Rechner
        </h1>
        <p className="text-sm text-muted-foreground">
          Diese Funktion steht nur der Einrichtungsleitung bzw. dem
          Träger-Admin zur Verfügung.
        </p>
      </div>
    );
  }

  const today = toIsoDateString(new Date());

  const [{ data: bookingTimeBands }, { data: weightingFactors }, { data: gruppen }] =
    await Promise.all([
      supabase
        .from("booking_time_bands")
        .select("id, label, factor")
        .order("sort_order"),
      supabase.from("weighting_factors").select("id, code, label, factor"),
      einrichtungId
        ? supabase
            .from("gruppen")
            .select("id, sollplatze")
            .eq("einrichtung_id", einrichtungId)
            .is("archived_at", null)
        : Promise.resolve({ data: null }),
    ]);

  const [kinderRows, teamRows] = einrichtungId
    ? await Promise.all([
        getKinderPresenceAtDate(supabase, einrichtungId, today),
        getTeamPresenceForMonth(supabase, einrichtungId, today),
      ])
    : [[], []];

  const bands = (bookingTimeBands ?? []).map((b) => ({
    id: b.id,
    label: b.label,
    factor: Number(b.factor),
  }));
  const categories = (weightingFactors ?? []).map((w) => ({
    id: w.id,
    code: w.code,
    label: w.label,
    factor: Number(w.factor),
  }));

  const initialMatrix: Record<string, Record<string, number>> = {};
  for (const category of categories) {
    initialMatrix[category.id] = {};
    for (const band of bands) {
      const count = kinderRows.filter(
        (r) =>
          r.weighting_factor_id === category.id &&
          r.buchungszeit_band_id === band.id
      ).length;
      initialMatrix[category.id][band.id] = count;
    }
  }

  const initialPersonal = teamRows.map((t) => ({
    role_category: t.role_category ?? "ek",
    wochenstunden: t.wochenstunden ?? 0,
  }));

  const initialSollplaetzeSumme = (gruppen ?? []).reduce(
    (sum, g) => sum + Number(g.sollplatze),
    0
  );
  const initialGruppenAnzahl = gruppen?.length ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Szenario-Rechner
        </h1>
        <p className="text-sm text-muted-foreground">
          Vorbefüllt mit den echten heutigen Zahlen — Änderungen hier werden
          nirgends gespeichert, rein zum Durchrechnen.
        </p>
      </div>
      <SzenarioRechner
        bands={bands}
        categories={categories}
        initialMatrix={initialMatrix}
        initialPersonal={initialPersonal}
        initialSollplaetzeSumme={initialSollplaetzeSumme}
        initialGruppenAnzahl={initialGruppenAnzahl}
      />
    </div>
  );
}
