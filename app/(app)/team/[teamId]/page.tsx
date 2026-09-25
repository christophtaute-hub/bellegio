import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import Link from "next/link";
import { FileText } from "lucide-react";
import { canWritePersonal, canViewFinanzen, canWriteFinanzen, getCurrentUserRole } from "@/lib/server/current-user-role";
import { DatenschutzAktionen } from "@/components/datenschutz/datenschutz-aktionen";
import { istAnonymisiert, istEntfernbar } from "@/lib/datenschutz/loeschfrist";
import { buttonVariants } from "@/components/ui/button";
import { TeamForm } from "@/components/team/team-form";
import { DruckButton } from "@/components/shared/druck-button";
import { DruckKopf } from "@/components/shared/druck-kopf";
import { TEAM_ROLE_CATEGORY_LABEL } from "@/lib/constants";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { AusfallzeitenListe } from "@/components/team/ausfallzeiten-liste";
import {
  Aenderungshistorie,
  type AenderungsEintrag,
} from "@/components/kinder/aenderungshistorie";
import { TEAM_FELDER } from "@/lib/datenschutz/auskunft";
import { ErfolgsToast } from "@/components/shared/erfolgs-toast";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: mitglied } = await supabase
    .from("team")
    .select(
      "id, einrichtung_id, vorname, nachname, rolle, gruppe_id, wochenstunden, role_category, status, eintritt, austritt"
    )
    .eq("id", teamId)
    .single();

  if (!mitglied || mitglied.einrichtung_id !== einrichtungId) {
    notFound();
  }

  const [{ data: gruppen }, { data: ausfallzeiten }, canEditPersonal, zeigeFinanzen, bearbeiteFinanzen, { data: auditLog }, { data: einrichtung }] =
    await Promise.all([
      supabase
        .from("gruppen")
        .select("id, name")
        .eq("einrichtung_id", einrichtungId ?? "")
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("team_ausfallzeiten")
        .select("id, art, von, bis, notizen")
        .eq("team_id", teamId)
        .order("von", { ascending: false }),
      einrichtungId ? canWritePersonal(supabase, einrichtungId) : false,
      einrichtungId ? canViewFinanzen(supabase, einrichtungId) : false,
      einrichtungId ? canWriteFinanzen(supabase, einrichtungId) : false,
      supabase
        .from("team_audit_log")
        .select("id, changed_at, old_data, new_data, user_profiles(full_name)")
        .eq("team_id", teamId)
        .order("changed_at", { ascending: false }),
      supabase.from("einrichtungen").select("name").eq("id", einrichtungId ?? "").single(),
    ]);

  // team_verguetung nur laden, wenn der Aufrufer überhaupt Finanzen-Zugriff hat — die primäre
  // Absicherung, dass Gehaltsdaten nie an TeamForm/den Client gereicht werden, wenn sie dort nicht
  // hingehören (RLS auf team_verguetung ist das Backstop, nicht der einzige Schutz).
  const { data: verguetung } = zeigeFinanzen
    ? await supabase.from("team_verguetung").select("entgeltgruppe, stufe, monatsgehalt_manuell").eq("team_id", teamId).maybeSingle()
    : { data: null };

  const rolle = await getCurrentUserRole();
  const heuteIso = toIsoDateString(new Date());

  const aenderungen: AenderungsEintrag[] = (auditLog ?? []).map((entry) => ({
    id: entry.id,
    changed_at: entry.changed_at,
    changed_by_name: entry.user_profiles?.full_name ?? null,
    old_data: entry.old_data as Record<string, unknown> | null,
    new_data: entry.new_data as Record<string, unknown>,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <ErfolgsToast text="Personal gespeichert." />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl text-primary">
          {mitglied.vorname} {mitglied.nachname}
        </h1>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {canEditPersonal ? (
            <Link href={`/team/${mitglied.id}/auskunft`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FileText className="size-3.5" />
              Auskunft (Art. 15 DSGVO)
            </Link>
          ) : null}
          <DruckButton />
        </div>
      </div>
      <DruckKopf
        titel="Änderungsverlauf — Personal"
        untertitel={`${einrichtung?.name ?? ""} · Stand ${formatDate(toIsoDateString(new Date()))}`}
        felder={[
          { label: "Name", wert: `${mitglied.vorname ?? ""} ${mitglied.nachname ?? ""}`.trim() },
          { label: "Rolle", wert: mitglied.rolle ?? "" },
          { label: "Kategorie", wert: TEAM_ROLE_CATEGORY_LABEL[mitglied.role_category] ?? mitglied.role_category },
          { label: "Gruppe", wert: (gruppen ?? []).find((g) => g.id === mitglied.gruppe_id)?.name ?? "" },
          { label: "Wochenstunden", wert: mitglied.wochenstunden !== null ? String(mitglied.wochenstunden) : "" },
          { label: "Status", wert: mitglied.status },
          { label: "Eintritt", wert: formatDate(mitglied.eintritt) },
          { label: "Austritt", wert: formatDate(mitglied.austritt) },
        ]}
      />
      <div className="flex flex-col gap-6 print:hidden">
      <TeamForm
        mode="edit"
        teamId={mitglied.id}
        einrichtungId={einrichtungId ?? ""}
        defaultValues={{
          vorname: mitglied.vorname ?? "",
          nachname: mitglied.nachname ?? "",
          rolle: mitglied.rolle ?? "",
          gruppe_id: mitglied.gruppe_id ?? "",
          wochenstunden:
            mitglied.wochenstunden !== null ? String(mitglied.wochenstunden) : "",
          role_category: mitglied.role_category as
            | "fk"
            | "ek"
            | "ak"
            | "nicht_paed"
            | "sprachfoerderung"
            | "hausmeister"
            | "hauswirtschaft",
          status: mitglied.status as "aktiv" | "inaktiv" | "geplant",
          eintritt: mitglied.eintritt ?? "",
          austritt: mitglied.austritt ?? "",
          entgeltgruppe: verguetung?.entgeltgruppe ?? "",
          stufe: verguetung?.stufe !== null && verguetung?.stufe !== undefined ? String(verguetung.stufe) : "",
          monatsgehalt_manuell: verguetung?.monatsgehalt_manuell !== null && verguetung?.monatsgehalt_manuell !== undefined ? String(verguetung.monatsgehalt_manuell) : "",
        }}
        gruppen={(gruppen ?? []).map((g) => ({ id: g.id, label: g.name }))}
        canViewFinanzen={zeigeFinanzen}
        canWriteFinanzen={bearbeiteFinanzen}
      />
      <AusfallzeitenListe
        teamId={mitglied.id}
        ausfallzeiten={ausfallzeiten ?? []}
        canEdit={canEditPersonal}
      />
      </div>
      <Aenderungshistorie
        eintraege={aenderungen}
        felder={TEAM_FELDER}
        aufloesen={(feld, wert) => (feld === "gruppe_id" ? ((gruppen ?? []).find((g) => g.id === wert)?.name ?? null) : null)}
      />
      {rolle === "traeger_admin" ? (
        <DatenschutzAktionen
          art="team"
          id={mitglied.id}
          name={`${mitglied.vorname ?? ""} ${mitglied.nachname ?? ""}`.trim()}
          entfernbar={istEntfernbar(mitglied.status, mitglied.austritt, heuteIso)}
          bereitsAnonym={istAnonymisiert("team", mitglied.vorname, mitglied.nachname)}
          zurueckHref="/team"
        />
      ) : null}
    </div>
  );
}
