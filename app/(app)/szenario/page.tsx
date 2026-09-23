import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { toIsoDateString } from "@/lib/kita-datum";
import { canUseSzenarioRechner } from "@/lib/server/current-user-role";
import { getKinderPresenceAtDate } from "@/lib/dashboard/presence";
import { getTeamPresenceForMonth, getStaffingRules } from "@/lib/team/anstellungsschluessel";
import { getBWPersonalschluesselTabelle } from "@/lib/team/personalschluessel-bw";
import { getNRWPersonalstundenTabelle } from "@/lib/team/personalschluessel-nrw";
import { SzenarioRechner } from "@/components/szenario/szenario-rechner";
import { SzenarioRechnerBW } from "@/components/szenario/szenario-rechner-bw";
import { SzenarioRechnerNRW } from "@/components/szenario/szenario-rechner-nrw";

export default async function SzenarioPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const erlaubt = einrichtungId
    ? await canUseSzenarioRechner(supabase, einrichtungId)
    : false;

  if (!erlaubt) {
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

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("empfohlener_anstellungsschluessel, vollzeit_wochenstunden, bundesland_code")
        .eq("id", einrichtungId)
        .single()
    : { data: null };
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const vollzeitWochenstunden = einrichtung?.vollzeit_wochenstunden ?? 39;

  const teamRows = einrichtungId
    ? await getTeamPresenceForMonth(supabase, einrichtungId, today)
    : [];

  let inhalt: React.ReactNode;

  if (bundeslandCode === "bw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      einrichtungId
        ? supabase
            .from("gruppen")
            .select("name, bw_betriebsform, bw_altersmischung, bw_oeffnungszeit_stunden, bw_randzeit_stunden")
            .eq("einrichtung_id", einrichtungId)
            .is("archived_at", null)
        : Promise.resolve({ data: null }),
      getBWPersonalschluesselTabelle(supabase),
    ]);
    const initialGruppen = (gruppenRows ?? []).map((g) => ({
      name: g.name,
      betriebsform: g.bw_betriebsform,
      altersmischung: g.bw_altersmischung,
      oeffnungszeitStunden: g.bw_oeffnungszeit_stunden,
      randzeitStunden: g.bw_randzeit_stunden,
    }));
    const initialPersonal = teamRows.map((t) => ({ wochenstunden: t.wochenstunden ?? 0 }));

    inhalt = (
      <SzenarioRechnerBW
        tabelle={tabelle}
        initialGruppen={initialGruppen}
        initialPersonal={initialPersonal}
        vollzeitWochenstunden={vollzeitWochenstunden}
      />
    );
  } else if (bundeslandCode === "nrw") {
    const [{ data: gruppenRows }, tabelle] = await Promise.all([
      einrichtungId
        ? supabase
            .from("gruppen")
            .select("name, nrw_gruppenform, nrw_buchungszeit_stunden")
            .eq("einrichtung_id", einrichtungId)
            .is("archived_at", null)
        : Promise.resolve({ data: null }),
      getNRWPersonalstundenTabelle(supabase),
    ]);
    const initialGruppen = (gruppenRows ?? []).map((g) => ({
      name: g.name,
      gruppenform: g.nrw_gruppenform,
      buchungszeitStunden: g.nrw_buchungszeit_stunden,
    }));
    const initialPersonal = teamRows
      .filter((t) => t.role_category === "fk" || t.role_category === "ek")
      .map((t) => ({
        roleCategory: t.role_category as "fk" | "ek",
        wochenstunden: t.wochenstunden ?? 0,
      }));

    inhalt = (
      <SzenarioRechnerNRW
        tabelle={tabelle}
        initialGruppen={initialGruppen}
        initialPersonal={initialPersonal}
      />
    );
  } else {
    const [{ data: bookingTimeBands }, { data: weightingFactors }, { data: gruppen }] =
      await Promise.all([
        supabase
          .from("booking_time_bands")
          .select("id, label, factor")
          .eq("bundesland_code", bundeslandCode)
          .order("sort_order"),
        supabase
          .from("weighting_factors")
          .select("id, code, label, factor")
          .eq("bundesland_code", bundeslandCode),
        einrichtungId
          ? supabase
              .from("gruppen")
              .select("id, sollplatze")
              .eq("einrichtung_id", einrichtungId)
              .is("archived_at", null)
          : Promise.resolve({ data: null }),
      ]);

    const [kinderRows, staffingRules] = einrichtungId
      ? await Promise.all([
          getKinderPresenceAtDate(supabase, einrichtungId, today),
          getStaffingRules(supabase, bundeslandCode),
        ])
      : [[], await getStaffingRules(supabase, bundeslandCode)];

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
    const empfohlenerSchluesselWert =
      einrichtung?.empfohlener_anstellungsschluessel ?? 10.0;

    inhalt = (
      <SzenarioRechner
        bands={bands}
        categories={categories}
        initialMatrix={initialMatrix}
        initialPersonal={initialPersonal}
        initialSollplaetzeSumme={initialSollplaetzeSumme}
        empfohlenerSchluesselWert={empfohlenerSchluesselWert}
        vollzeitWochenstunden={vollzeitWochenstunden}
        staffingRules={staffingRules}
      />
    );
  }

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
      {inhalt}
    </div>
  );
}
