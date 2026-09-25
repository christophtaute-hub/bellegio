import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getCurrentUserRole, canViewFinanzen, canWriteFinanzen } from "@/lib/server/current-user-role";
import { VollzeitWochenstundenEditor } from "@/components/team/vollzeit-wochenstunden-editor";
import { EmpfohlenerSchluesselEditor } from "@/components/team/empfohlener-schluessel-editor";
import { GrunddatenEditor } from "@/components/einrichtung/grunddaten-editor";
import { EinrichtungenVerwalten } from "@/components/einrichtung/einrichtungen-verwalten";
import {
  FoerderungManuellEditor,
  LohnnebenkostenEditor,
  JahressonderzahlungEditor,
} from "@/components/einrichtung/finanzen-editoren";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";

async function ladeEinrichtungenFuerVerwaltung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tragerId: string
) {
  const { data } = await supabase
    .from("einrichtungen")
    .select("id, name, address_city, bundesland_code")
    .eq("trager_id", tragerId)
    .is("archived_at", null)
    .order("name");
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    ort: e.address_city,
    bundeslandLabel: BUNDESLAENDER.find((b) => b.code === e.bundesland_code)?.label ?? e.bundesland_code,
  }));
}

export default async function EinstellungenPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const canEdit = role === "traeger_admin";

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select(
          "name, address_street, address_city, address_zip, kita_year_start_month, bundesland_code, vollzeit_wochenstunden, empfohlener_anstellungsschluessel, standort_gemeinde, auswaertigen_quote_prozent, kostenstelle, cluster, foerderung_monatlich_manuell, lohnnebenkosten_prozent, jahressonderzahlung_prozent"
        )
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  // Bewusst eigene zeigeFinanzen/bearbeiteFinanzen statt der obigen canEdit-Variable
  // wiederzuverwenden — canEdit stammt von vor dem granularen Rechte-System und würde einen
  // legitim berechtigten Nicht-Admin fälschlich vom Finanzen-Abschnitt ausschließen.
  const zeigeFinanzen = einrichtungId ? await canViewFinanzen(supabase, einrichtungId) : false;
  const bearbeiteFinanzen = einrichtungId ? await canWriteFinanzen(supabase, einrichtungId) : false;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: eigenesProfil } = authUser
    ? await supabase.from("user_profiles").select("id, trager_id, role").eq("id", authUser.id).single()
    : { data: null };

  const istTraegerAdmin = eigenesProfil?.role === "traeger_admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Einrichtungs-Einstellungen
        </h1>
        <div className="flex items-center gap-4">
          <a href="/einstellungen/nutzer" className="text-sm text-primary underline-offset-2 hover:underline">
            Nutzer &amp; Rechte →
          </a>
          {istTraegerAdmin ? (
            <a href="/einstellungen/datenschutz" className="text-sm text-primary underline-offset-2 hover:underline">
              Datenschutz →
            </a>
          ) : null}
          <a
            href="/einstellungen/profil"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Mein Profil →
          </a>
        </div>
      </div>

      {einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Einrichtung</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Grunddaten der Einrichtung — sichtbar u.a. in Header, Startseite
            und Dokumentation.
          </p>
          <GrunddatenEditor
            einrichtungId={einrichtungId}
            grunddaten={{
              name: einrichtung.name,
              address_street: einrichtung.address_street,
              address_city: einrichtung.address_city,
              address_zip: einrichtung.address_zip,
              kita_year_start_month: einrichtung.kita_year_start_month,
              standort_gemeinde: einrichtung.standort_gemeinde,
              auswaertigen_quote_prozent: einrichtung.auswaertigen_quote_prozent,
              kostenstelle: einrichtung.kostenstelle,
              cluster: einrichtung.cluster,
            }}
            bundeslandCode={einrichtung.bundesland_code}
            canEdit={canEdit}
          />
        </section>
      ) : null}

      {einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">
            Personalbemessung
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Diese Werte fließen in die Anstellungsschlüssel-Berechnung auf
            Dashboard, Team, Controlling und Szenario-Rechner ein.
          </p>
          <div className="flex flex-col gap-3">
            <VollzeitWochenstundenEditor
              einrichtungId={einrichtungId}
              vollzeitWochenstunden={Number(einrichtung.vollzeit_wochenstunden)}
              canEdit={canEdit}
            />
            <EmpfohlenerSchluesselEditor
              einrichtungId={einrichtungId}
              empfohlenerSchluessel={Number(
                einrichtung.empfohlener_anstellungsschluessel
              )}
              canEdit={canEdit}
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Einrichtung ausgewählt.
        </p>
      )}

      {zeigeFinanzen && einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Finanzen</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Fördererlöse, Lohnnebenkosten und Jahressonderzahlung fließen ins Ergebnis in Controlling
            ein. Lohnnebenkosten und Jahressonderzahlung sind Schätzwerte mit uneinheitlichen Quellen —
            bei Bedarf an die eigene Situation anpassen.
          </p>
          <div className="flex flex-col gap-3">
            <FoerderungManuellEditor
              einrichtungId={einrichtungId}
              bundeslandCode={einrichtung.bundesland_code}
              wert={einrichtung.foerderung_monatlich_manuell}
              canEdit={bearbeiteFinanzen}
            />
            <LohnnebenkostenEditor
              einrichtungId={einrichtungId}
              prozent={Number(einrichtung.lohnnebenkosten_prozent)}
              canEdit={bearbeiteFinanzen}
            />
            <JahressonderzahlungEditor
              einrichtungId={einrichtungId}
              prozent={Number(einrichtung.jahressonderzahlung_prozent)}
              canEdit={bearbeiteFinanzen}
            />
          </div>
        </section>
      ) : null}

      {istTraegerAdmin && einrichtungId && eigenesProfil ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Einrichtungen des Trägers</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Weitere Einrichtungen anlegen oder nicht mehr genutzte archivieren. Archivierte Einrichtungen verschwinden
            aus der Auswahl, ihre Daten bleiben erhalten.
          </p>
          <EinrichtungenVerwalten
            aktiveId={einrichtungId}
            einrichtungen={await ladeEinrichtungenFuerVerwaltung(supabase, eigenesProfil.trager_id)}
          />
        </section>
      ) : null}
    </div>
  );
}
