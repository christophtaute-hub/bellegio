import { notFound } from "next/navigation";
import { BASIS_FAKTOR, istBasisCode, leiteBasisfaktorAb } from "@/lib/kinder/basisfaktor";
import { WechselKarte } from "@/components/kinder/wechsel-karte";
import { ladeWechselDaten } from "@/lib/steuerung/wechsel-daten";
import { NachfolgerZuordnen } from "@/components/gruppen/nachfolger-zuordnen";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canWriteBelegung, getCurrentUserRole } from "@/lib/server/current-user-role";
import { DatenschutzAktionen } from "@/components/datenschutz/datenschutz-aktionen";
import { istAnonymisiert, istEntfernbar } from "@/lib/datenschutz/loeschfrist";
import { buttonVariants } from "@/components/ui/button";
import { KindForm } from "@/components/kinder/kind-form";
import { ErfolgsToast } from "@/components/shared/erfolgs-toast";
import {
  Aenderungshistorie,
  type AenderungsEintrag,
} from "@/components/kinder/aenderungshistorie";
import { NotizenVerlauf, type NotizEintrag } from "@/components/kinder/notizen-verlauf";
import type { GruppeFuerPassung } from "@/lib/kinder/gruppen-passung";
import { KIND_FELDER } from "@/lib/datenschutz/auskunft";
import { DruckButton } from "@/components/shared/druck-button";
import { DruckKopf } from "@/components/shared/druck-kopf";
import { GESCHLECHT_LABEL, KIND_STATUS_LABEL } from "@/lib/constants";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";

export default async function KindDetailPage({
  params,
}: {
  params: Promise<{ kindId: string }>;
}) {
  const { kindId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: kind } = await supabase
    .from("kinder")
    .select(
      "id, einrichtung_id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, vertrag_gueltig_bis, buchungszeit_band_id, wohnort, hat_behinderung, ersetzt_kind_id"
    )
    .eq("id", kindId)
    .single();

  if (!kind || kind.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("name, bundesland_code, standort_gemeinde, auswaertigen_quote_prozent")
    .eq("id", einrichtungId ?? "")
    .single();
  const bundeslandCode = einrichtung?.bundesland_code ?? "by";

  const [
    { data: gruppen },
    { data: aktiveKinder },
    { data: bookingTimeBands },
    { data: weightingFactors },
    { data: kindWeightingFactors },
    { data: notizenRoh },
  ] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId ?? "")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select("id, vorname, nachname, gruppe_id, geschlecht, wohnort, status")
      .eq("einrichtung_id", einrichtungId ?? "")
      .eq("status", "aktiv")
      .is("archived_at", null),
    supabase
      .from("booking_time_bands")
      .select("id, label")
      .eq("bundesland_code", bundeslandCode)
      .order("sort_order"),
    supabase
      .from("weighting_factors")
      .select("id, label, code")
      .eq("bundesland_code", bundeslandCode),
    supabase
      .from("kind_weighting_factors")
      .select("weighting_factor_id")
      .eq("kind_id", kindId),
    supabase
      .from("kind_notizen_verlauf")
      .select("id, text, erstellt_am, user_profiles(full_name)")
      .eq("kind_id", kindId)
      .order("erstellt_am", { ascending: false }),
  ]);

  const kinderProGruppe = new Map<string, { geschlecht: string }[]>();
  for (const k of aktiveKinder ?? []) {
    if (!k.gruppe_id) continue;
    const liste = kinderProGruppe.get(k.gruppe_id) ?? [];
    liste.push({ geschlecht: k.geschlecht });
    kinderProGruppe.set(k.gruppe_id, liste);
  }
  const gruppenMitKindern: GruppeFuerPassung[] = (gruppen ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    gruppenart: g.gruppenart,
    sollplatze: Number(g.sollplatze),
    aktiveKinder: kinderProGruppe.get(g.id) ?? [],
  }));
  const gruppenArtById = Object.fromEntries((gruppen ?? []).map((g) => [g.id, g.gruppenart]));
  const aktiveKinderZurAuswahl = (aktiveKinder ?? []).map((k) => ({
    id: k.id,
    vorname: k.vorname,
    nachname: k.nachname,
    gruppe_id: k.gruppe_id ?? "",
  }));

  // Nachfolge: „Kind B rückt für Kind A nach“ — vom austretenden Kind und vom Nachrücker aus sichtbar
  const [{ data: nachrueckerPool }, { data: nachfolgerRoh }, { data: ersetztesKind }] = await Promise.all([
    kind.status === "aktiv"
      ? supabase
          .from("kinder")
          .select("id, vorname, nachname, eintritt")
          .eq("einrichtung_id", einrichtungId ?? "")
          .in("status", ["nachruecker", "geplant"])
          .is("ersetzt_kind_id", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    kind.status === "aktiv"
      ? supabase.from("kinder").select("id, vorname, nachname, eintritt").eq("ersetzt_kind_id", kind.id).maybeSingle()
      : Promise.resolve({ data: null }),
    kind.ersetzt_kind_id
      ? supabase.from("kinder").select("id, vorname, nachname, austritt").eq("id", kind.ersetzt_kind_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Interner Wechsel (Krippe → Kindergarten): nur für aktive Krippenkinder berechnen
  const istKrippenKind = kind.status === "aktiv" && gruppenArtById[kind.gruppe_id ?? ""] === "krippe";
  let wechselGeplant: { nachGruppeName: string; abDatum: string } | null = null;
  let wechselVorschlag: Awaited<ReturnType<typeof ladeWechselDaten>>["vorschlaege"][number] | null = null;
  let wechselOhnePlatz: { fruehesterTermin: string; austritt: string } | null = null;
  if (istKrippenKind && einrichtungId) {
    const heute = toIsoDateString(new Date());
    const { data: alleKinder } = await supabase
      .from("kinder")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort, ersetzt_kind_id")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .limit(3000);
    const wd = await ladeWechselDaten(supabase, einrichtungId, {
      gruppen: (gruppen ?? []).map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) })),
      kinder: (alleKinder ?? []).map((k) => ({
        id: k.id,
        vorname: k.vorname,
        nachname: k.nachname,
        geburtsdatum: k.geburtsdatum,
        geschlecht: k.geschlecht,
        status: k.status,
        gruppeId: k.gruppe_id,
        eintritt: k.eintritt,
        austritt: k.austritt,
        wohnort: k.wohnort,
        ersetztKindId: k.ersetzt_kind_id,
      })),
      startMonat: `${heute.slice(0, 7)}-01`,
      monate: 18,
      heute,
    });
    wechselGeplant = wd.geplant.find((w) => w.kindId === kind.id) ?? null;
    wechselVorschlag = wd.vorschlaege.find((v) => v.kindId === kind.id) ?? null;
    const op = wd.ohnePlatz.find((o) => o.kindId === kind.id);
    wechselOhnePlatz = op ? { fruehesterTermin: op.fruehesterTermin, austritt: op.austritt } : null;
  }

  const { data: auditLog } = await supabase
    .from("kinder_audit_log")
    .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
    .eq("kind_id", kindId)
    .order("changed_at", { ascending: false });

  const aenderungen: AenderungsEintrag[] = (auditLog ?? []).map((entry) => ({
    id: entry.id,
    changed_at: entry.changed_at,
    changed_by_name: entry.user_profiles?.full_name ?? null,
    old_data: entry.old_data as Record<string, unknown> | null,
    new_data: entry.new_data as Record<string, unknown>,
  }));

  const notizen: NotizEintrag[] = (notizenRoh ?? []).map((n) => ({
    id: n.id,
    text: n.text,
    erstellt_von_name: n.user_profiles?.full_name ?? null,
    erstellt_am: n.erstellt_am,
  }));

  const auswaertigenQuote =
    bundeslandCode === "bw" &&
    einrichtung?.standort_gemeinde &&
    einrichtung?.auswaertigen_quote_prozent !== null &&
    einrichtung?.auswaertigen_quote_prozent !== undefined
      ? {
          standortGemeinde: einrichtung.standort_gemeinde,
          auswaertigenQuoteProzent: Number(einrichtung.auswaertigen_quote_prozent),
          bestehendeWohnorte: (aktiveKinder ?? [])
            .filter((k) => k.id !== kind.id)
            .map((k) => k.wohnort),
        }
      : undefined;

  const heuteIso = toIsoDateString(new Date());
  const [rolle, darfAuskunft, darfBelegungBearbeiten] = await Promise.all([
    getCurrentUserRole(),
    einrichtungId ? canWriteBelegung(supabase, einrichtungId) : false,
    einrichtungId ? canWriteBelegung(supabase, einrichtungId) : false,
  ]);

  const bayernBasisAbgeleitet = (weightingFactors ?? []).some((w) => w.code === "u3");
  const gewichtungsLabels = [
    ...(bayernBasisAbgeleitet
      ? [
          BASIS_FAKTOR[
            leiteBasisfaktorAb({
              geburtsdatum: kind.geburtsdatum,
              stichtag: toIsoDateString(new Date()),
              gruppenartBeiDrittemGeburtstag: gruppenArtById[kind.gruppe_id ?? ""] ?? null,
            })
          ].label,
        ]
      : []),
    ...(weightingFactors ?? [])
      .filter((w) => !(bayernBasisAbgeleitet && istBasisCode(w.code)))
      .filter((w) => (kindWeightingFactors ?? []).some((k) => k.weighting_factor_id === w.id))
      .map((w) => w.label),
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <ErfolgsToast text="Kind gespeichert." />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl text-primary">
          {kind.vorname} {kind.nachname}
        </h1>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {darfAuskunft ? (
            <Link href={`/kinder/${kind.id}/auskunft`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FileText className="size-3.5" />
              Auskunft (Art. 15 DSGVO)
            </Link>
          ) : null}
          <DruckButton />
        </div>
      </div>
      <DruckKopf
        titel="Änderungsverlauf — Kind"
        untertitel={`${einrichtung?.name ?? ""} · Stand ${formatDate(toIsoDateString(new Date()))}`}
        felder={[
          { label: "Name", wert: `${kind.vorname} ${kind.nachname}` },
          { label: "Geburtsdatum", wert: formatDate(kind.geburtsdatum) },
          { label: "Geschlecht", wert: GESCHLECHT_LABEL[kind.geschlecht] ?? kind.geschlecht },
          { label: "Status", wert: KIND_STATUS_LABEL[kind.status] ?? kind.status },
          { label: "Gruppe", wert: (gruppen ?? []).find((g) => g.id === kind.gruppe_id)?.name ?? "" },
          { label: "Eintritt", wert: formatDate(kind.eintritt) },
          { label: "Austritt", wert: formatDate(kind.austritt) },
          {
            label: "Buchungszeit",
            wert: (bookingTimeBands ?? []).find((b) => b.id === kind.buchungszeit_band_id)?.label ?? "",
          },
          { label: "Gewichtung", wert: gewichtungsLabels.join(", ") },
          { label: "I-Status", wert: kind.hat_behinderung ? "Ja" : "Nein" },
          { label: "Wohnort", wert: kind.wohnort ?? "" },
        ]}
      />
      {istKrippenKind ? (
        <WechselKarte
          kindId={kind.id}
          kindName={`${kind.vorname} ${kind.nachname}`}
          geplant={wechselGeplant}
          vorschlag={wechselVorschlag}
          ohnePlatz={wechselOhnePlatz}
          aktuellerAustritt={kind.austritt}
          darfBearbeiten={darfBelegungBearbeiten}
        />
      ) : null}
      {kind.status === "aktiv" && kind.austritt ? (
        <section id="nachfolge" className="flex flex-col gap-2 rounded-2xl border bg-card p-4 print:hidden">
          <h2 className="font-heading text-base text-primary">Nachfolge</h2>
          <p className="text-xs text-muted-foreground">Austritt am {formatDate(kind.austritt)} — wer übernimmt den Platz?</p>
          <NachfolgerZuordnen
            austretendId={kind.id}
            austretendName={`${kind.vorname} ${kind.nachname}`}
            austritt={kind.austritt}
            nachfolger={
              nachfolgerRoh
                ? { kindId: nachfolgerRoh.id, name: `${nachfolgerRoh.vorname} ${nachfolgerRoh.nachname}`, eintritt: nachfolgerRoh.eintritt }
                : null
            }
            optionen={(nachrueckerPool ?? [])
              .map((n) => ({ id: n.id, name: `${n.vorname} ${n.nachname}`, eintritt: n.eintritt }))
              .sort((a, b) => a.name.localeCompare(b.name, "de"))}
            darfBearbeiten={darfBelegungBearbeiten}
          />
        </section>
      ) : null}
      {ersetztesKind ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm print:hidden">
          Rückt nach für{" "}
          <Link href={`/kinder/${ersetztesKind.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
            {ersetztesKind.vorname} {ersetztesKind.nachname}
          </Link>
          {ersetztesKind.austritt ? ` (Austritt ${formatDate(ersetztesKind.austritt)})` : ""}.
        </p>
      ) : null}
      <div className="print:hidden">
      <KindForm
        mode="edit"
        kindId={kind.id}
        defaultValues={{
          vorname: kind.vorname,
          nachname: kind.nachname,
          geburtsdatum: kind.geburtsdatum,
          geschlecht: kind.geschlecht as
            | "maennlich"
            | "weiblich"
            | "divers"
            | "keine_angabe",
          status: kind.status as "aktiv" | "nachruecker" | "geplant",
          gruppe_id: kind.gruppe_id ?? "",
          eintritt: kind.eintritt ?? "",
          austritt: kind.austritt ?? "",
          vertrag_gueltig_bis: kind.vertrag_gueltig_bis ?? "",
          buchungszeit_band_id: kind.buchungszeit_band_id ?? "",
          wohnort: kind.wohnort ?? "",
          hat_behinderung: kind.hat_behinderung,
          weighting_factor_ids: (kindWeightingFactors ?? []).map(
            (row) => row.weighting_factor_id
          ),
          ersetzt_kind_id: kind.ersetzt_kind_id ?? "",
        }}
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
        gruppenMitKindern={gruppenMitKindern}
        gruppenArtById={gruppenArtById}
        aktiveKinderZurAuswahl={aktiveKinderZurAuswahl}
        bookingTimeBands={(bookingTimeBands ?? []).map((b) => ({
          id: b.id,
          label: b.label,
        }))}
        weightingFactors={(weightingFactors ?? []).map((w) => ({
          id: w.id,
          label: w.label,
          code: w.code,
        }))}
        auswaertigenQuote={auswaertigenQuote}
      />
      </div>
      <div className="print:hidden">
        <NotizenVerlauf kindId={kind.id} eintraege={notizen} canEdit={darfBelegungBearbeiten} />
      </div>
      <Aenderungshistorie
        eintraege={aenderungen}
        felder={KIND_FELDER}
        aufloesen={(feld, wert) =>
          feld === "gruppe_id"
            ? ((gruppen ?? []).find((g) => g.id === wert)?.name ?? null)
            : feld === "buchungszeit_band_id"
              ? ((bookingTimeBands ?? []).find((b) => b.id === wert)?.label ?? null)
              : null
        }
      />
      {rolle === "traeger_admin" ? (
        <DatenschutzAktionen
          art="kind"
          id={kind.id}
          name={`${kind.vorname} ${kind.nachname}`}
          entfernbar={istEntfernbar(kind.status, kind.austritt, heuteIso)}
          bereitsAnonym={istAnonymisiert("kind", kind.vorname, kind.nachname)}
          zurueckHref="/kinder"
        />
      ) : null}
    </div>
  );
}
